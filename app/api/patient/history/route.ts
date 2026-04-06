import { NextResponse } from "next/server";

import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { bookingDateStartToIso } from "@/lib/wat-datetime";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await getPatientByProfileId(user.id);
    if (!patient) {
      return NextResponse.json({
        success: true,
        data: { items: [], page: 1, hasMore: false, totalFiltered: 0 },
      });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") ?? "10") || 10),
    );
    const therapistId = searchParams.get("therapistId")?.trim() || undefined;
    const dateFrom = searchParams.get("dateFrom")?.trim();
    const dateTo = searchParams.get("dateTo")?.trim();
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";

    const rows = await prisma.therapyBooking.findMany({
      where: {
        patientId: patient.id,
        status: { in: ["completed", "cancelled"] },
        ...(therapistId ? { therapistId } : {}),
        ...(dateFrom || dateTo
          ? {
              date: {
                ...(dateFrom
                  ? { gte: new Date(`${dateFrom}T00:00:00+01:00`) }
                  : {}),
                ...(dateTo
                  ? { lte: new Date(`${dateTo}T23:59:59.999+01:00`) }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      include: {
        therapist: {
          include: { profile: { select: { fullName: true } } },
        },
        session: {
          select: {
            id: true,
            sessionNumber: true,
            durationMinutes: true,
            feedbacks: { select: { id: true }, take: 1 },
          },
        },
      },
    });

    const filtered = search
      ? rows.filter((b) => {
          const raw = b.therapist.profile.fullName.toLowerCase();
          const pub = therapistPublicLabel(
            b.therapist.profile.fullName,
          ).toLowerCase();
          return raw.includes(search) || pub.includes(search);
        })
      : rows;

    const start = (page - 1) * limit;
    const slice = filtered.slice(start, start + limit);
    const hasMore = start + slice.length < filtered.length;

    function durationFromTimes(startTime: string, endTime: string): number {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      let d = eh * 60 + em - (sh * 60 + sm);
      if (d < 0) d += 24 * 60;
      return d;
    }

    const items = slice.map((b) => ({
      id: b.id,
      date: b.date.toISOString(),
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      sessionType: b.sessionType,
      therapist: {
        id: b.therapist.id,
        name: therapistPublicLabel(b.therapist.profile.fullName),
      },
      sessionNumber: b.session?.sessionNumber ?? null,
      durationMins:
        b.session?.durationMinutes ??
        durationFromTimes(b.startTime, b.endTime),
      feedbackSubmitted: (b.session?.feedbacks.length ?? 0) > 0,
      dateIso: bookingDateStartToIso(b.date, b.startTime),
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        page,
        hasMore,
        totalFiltered: filtered.length,
      },
    });
  } catch (e) {
    console.error("client history GET:", e);
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 },
    );
  }
}
