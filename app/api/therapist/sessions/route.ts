import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { captureApiError } from "@/lib/sentry/capture";
import {
  bookingDateStartToIso,
  watDayStart,
  watTodayDateString,
} from "@/lib/wat-datetime";

const therapistSessionsSelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
  sessionType: true,
  patient: { select: { id: true, fullName: true, email: true } },
  session: {
    select: {
      id: true,
      sessionNumber: true,
      status: true,
      notesGenerated: true,
      note: {
        select: {
          id: true,
          noteType: true,
          isEdited: true,
          editedAt: true,
        },
      },
    },
  },
} as const;

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") ?? "upcoming";

    const todayYmd = watTodayDateString();
    const todayStart = watDayStart(todayYmd);

    if (filter === "upcoming") {
      const rows = await prisma.therapyBooking.findMany({
        where: {
          therapistId: therapist.id,
          status: "confirmed",
          date: { gte: todayStart },
        },
        select: therapistSessionsSelect,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 80,
      });

      const now = Date.now();
      const upcoming = rows.filter((b) => {
        const iso = bookingDateStartToIso(b.date, b.startTime);
        return new Date(iso).getTime() > now;
      });

      return NextResponse.json({ success: true, data: upcoming });
    }

    if (filter === "completed") {
      const rows = await prisma.therapyBooking.findMany({
        where: {
          therapistId: therapist.id,
          status: "completed",
        },
        select: therapistSessionsSelect,
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 50,
      });

      return NextResponse.json({ success: true, data: rows });
    }

    const rows = await prisma.therapyBooking.findMany({
      where: {
        therapistId: therapist.id,
        status: { in: ["confirmed", "completed", "cancelled"] },
      },
      select: therapistSessionsSelect,
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 50,
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    console.error("therapist/sessions GET:", e);
    captureApiError(e, { route: "/therapist/sessions" });
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
