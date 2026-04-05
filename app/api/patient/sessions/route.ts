import { NextResponse } from "next/server";

import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { bookingDateStartToIso } from "@/lib/wat-datetime";
import { watDayStart, watTodayDateString } from "@/lib/wat-datetime";

function mapBooking(
  b: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    status: string;
    sessionType: string;
    therapist: {
      id: string;
      profilePhoto: string | null;
      profile: { fullName: string };
    };
    session: {
      id: string;
      sessionNumber: number;
      feedbacks: { id: string }[];
    } | null;
  },
) {
  return {
    id: b.id,
    date: b.date.toISOString(),
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
    sessionType: b.sessionType,
    therapist: {
      id: b.therapist.id,
      name: b.therapist.profile.fullName,
      photo: b.therapist.profilePhoto ?? "/Ealho-logo.png",
    },
    session: b.session
      ? {
          id: b.session.id,
          sessionNumber: b.session.sessionNumber,
          feedbackSubmitted: b.session.feedbacks.length > 0,
        }
      : null,
  };
}

export async function GET() {
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
        data: { upcoming: [], past: [] },
      });
    }

    const todayStart = watDayStart(watTodayDateString());
    const nowMs = Date.now();

    const upcomingRaw = await prisma.therapyBooking.findMany({
      where: {
        patientId: patient.id,
        status: "confirmed",
        date: { gte: todayStart },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: {
        therapist: { include: { profile: { select: { fullName: true } } } },
        session: {
          select: {
            id: true,
            sessionNumber: true,
            feedbacks: { select: { id: true }, take: 1 },
          },
        },
      },
      take: 40,
    });

    const upcoming = upcomingRaw
      .filter(
        (b) =>
          new Date(bookingDateStartToIso(b.date, b.startTime)).getTime() >
          nowMs,
      )
      .map(mapBooking);

    const pastRaw = await prisma.therapyBooking.findMany({
      where: {
        patientId: patient.id,
        status: "completed",
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 20,
      include: {
        therapist: { include: { profile: { select: { fullName: true } } } },
        session: {
          select: {
            id: true,
            sessionNumber: true,
            feedbacks: { select: { id: true }, take: 1 },
          },
        },
      },
    });

    const past = pastRaw.map(mapBooking);

    return NextResponse.json({
      success: true,
      data: { upcoming, past },
    });
  } catch (e) {
    console.error("patient/sessions GET:", e);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
