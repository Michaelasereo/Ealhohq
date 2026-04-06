import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import {
  bookingDateStartToIso,
  watDayStart,
  watTodayDateString,
} from "@/lib/wat-datetime";

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
        include: {
          patient: { select: { id: true, fullName: true, email: true } },
          package: {
            select: { totalSessions: true, usedSessions: true, packageType: true },
          },
          session: {
            include: {
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
        },
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
        include: {
          patient: { select: { id: true, fullName: true, email: true } },
          package: {
            select: { totalSessions: true, usedSessions: true, packageType: true },
          },
          session: {
            include: {
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
        },
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
      include: {
        patient: { select: { id: true, fullName: true, email: true } },
        package: {
          select: { totalSessions: true, usedSessions: true, packageType: true },
        },
        session: {
          include: {
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
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 50,
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    console.error("therapist/sessions GET:", e);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
