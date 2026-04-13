import { NextResponse } from "next/server";

import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { bookingDateStartToIso } from "@/lib/wat-datetime";
import { watDayStart, watTodayDateString } from "@/lib/wat-datetime";

import { captureApiError } from "@/lib/sentry/capture";
const patientSessionsBookingSelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
  sessionType: true,
  paidWithCredits: true,
  rescheduleCount: true,
  therapist: {
    select: {
      id: true,
      profilePhoto: true,
      profile: { select: { fullName: true } },
    },
  },
  session: {
    select: {
      id: true,
      sessionNumber: true,
      feedbacks: { select: { id: true }, take: 1 },
    },
  },
} as const;

function mapBooking(
  b: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    status: string;
    sessionType: string;
    paidWithCredits: boolean;
    rescheduleCount: number;
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
    paidWithCredits: b.paidWithCredits,
    rescheduleCount: b.rescheduleCount,
    therapist: {
      id: b.therapist.id,
      name: therapistPublicLabel(b.therapist.profile.fullName),
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

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
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
      select: patientSessionsBookingSelect,
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
      select: patientSessionsBookingSelect,
    });

    const past = pastRaw.map(mapBooking);

    return NextResponse.json({
      success: true,
      data: { upcoming, past },
    });
  } catch (e) {
    console.error("client sessions GET:", e);
    captureApiError(e, { route: "/patient/sessions" });
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
