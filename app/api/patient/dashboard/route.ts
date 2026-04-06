import { NextResponse } from "next/server";

import { tierFromBalance } from "@/lib/credits/purchase-config";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { bookingDateStartToIso } from "@/lib/wat-datetime";
import { watDayStart, watTodayDateString } from "@/lib/wat-datetime";

function firstName(fullName: string) {
  const t = fullName.trim();
  return t.split(/\s+/)[0] ?? t;
}

const patientDashboardBookingSelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  sessionType: true,
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

function toSessionJson(b: {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  sessionType: string;
  therapist: {
    id: string;
    profilePhoto: string | null;
    profile: { fullName: string };
  };
  session: {
    id: string;
    sessionNumber: number;
    feedbacks?: { id: string }[];
  } | null;
}) {
  return {
    id: b.id,
    date: b.date.toISOString(),
    startTime: b.startTime,
    endTime: b.endTime,
    sessionType: b.sessionType,
    therapist: {
      id: b.therapist.id,
      name: therapistPublicLabel(b.therapist.profile.fullName),
      photo: b.therapist.profilePhoto ?? "/Ealho-logo.png",
    },
    session: b.session
      ? {
          id: b.session.id,
          sessionNumber: b.session.sessionNumber,
          feedbackSubmitted:
            "feedbacks" in b.session &&
            Array.isArray(b.session.feedbacks) &&
            b.session.feedbacks.length > 0,
        }
      : null,
  };
}

export async function GET(req: Request) {
  try {
    const zone = new URL(req.url).searchParams.get("zone");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profileBefore = await prisma.sharedProfile.findUnique({
      where: { id: user.id },
    });

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;

    const profile = await prisma.sharedProfile.findUnique({
      where: { id: user.id },
    });

    const mergedFromGuest = Boolean(
      profile?.guestMergeBannerPending && !profile?.guestMergeCompleted,
    );
    const mergedSessionCount = profile?.guestMergeSessionCount ?? 0;

    if (!patient) {
      const empty = {
        profile: { fullName: profileBefore?.fullName ?? "" },
        firstName: profileBefore ? firstName(profileBefore.fullName) : "there",
        upcomingSession: null,
        recentSessions: [] as ReturnType<typeof toSessionJson>[],
        credits: { balance: 0, tier: tierFromBalance(0) },
        totalSessions: 0,
        mergedFromGuest,
        mergedSessionCount,
      };
      if (zone === "stats") {
        return NextResponse.json({
          success: true,
          data: {
            firstName: empty.firstName,
            totalSessions: 0,
            credits: empty.credits,
            mergedFromGuest,
            mergedSessionCount,
          },
        });
      }
      if (zone === "next") {
        return NextResponse.json({
          success: true,
          data: { upcomingSession: null },
        });
      }
      if (zone === "recent") {
        return NextResponse.json({
          success: true,
          data: { recentSessions: [] },
        });
      }
      return NextResponse.json({ success: true, data: empty });
    }

    const todayStart = watDayStart(watTodayDateString());
    const nowMs = Date.now();

    if (zone === "stats") {
      const totalSessions = await prisma.therapyBooking.count({
        where: {
          patientId: patient.id,
          status: { in: ["confirmed", "completed"] },
        },
      });
      const credit = await prisma.therapyCredit.findUnique({
        where: { patientId: patient.id },
      });
      const balance = Number(credit?.balance ?? 0);
      return NextResponse.json({
        success: true,
        data: {
          firstName: firstName(
            patient.profile?.fullName ?? patient.fullName,
          ),
          totalSessions,
          credits: { balance, tier: tierFromBalance(balance) },
          mergedFromGuest,
          mergedSessionCount,
        },
      });
    }

    if (zone === "next") {
      const confirmedBookings = await prisma.therapyBooking.findMany({
        where: {
          patientId: patient.id,
          status: "confirmed",
          date: { gte: todayStart },
        },
        select: patientDashboardBookingSelect,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 20,
      });
      let upcomingSession = null as (typeof confirmedBookings)[0] | null;
      for (const b of confirmedBookings) {
        const startMs = new Date(
          bookingDateStartToIso(b.date, b.startTime),
        ).getTime();
        if (startMs > nowMs) {
          upcomingSession = b;
          break;
        }
      }
      return NextResponse.json({
        success: true,
        data: {
          upcomingSession: upcomingSession
            ? toSessionJson(upcomingSession)
            : null,
        },
      });
    }

    if (zone === "recent") {
      const recentBookings = await prisma.therapyBooking.findMany({
        where: {
          patientId: patient.id,
          status: "completed",
        },
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 3,
        select: patientDashboardBookingSelect,
      });
      return NextResponse.json({
        success: true,
        data: {
          recentSessions: recentBookings.map(toSessionJson),
        },
      });
    }

    const confirmedBookings = await prisma.therapyBooking.findMany({
      where: {
        patientId: patient.id,
        status: "confirmed",
        date: { gte: todayStart },
      },
      select: patientDashboardBookingSelect,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 20,
    });

    let upcomingSession = null as (typeof confirmedBookings)[0] | null;
    for (const b of confirmedBookings) {
      const startMs = new Date(
        bookingDateStartToIso(b.date, b.startTime),
      ).getTime();
      if (startMs > nowMs) {
        upcomingSession = b;
        break;
      }
    }

    const recentBookings = await prisma.therapyBooking.findMany({
      where: {
        patientId: patient.id,
        status: "completed",
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 3,
      select: patientDashboardBookingSelect,
    });

    const totalSessions = await prisma.therapyBooking.count({
      where: {
        patientId: patient.id,
        status: { in: ["confirmed", "completed"] },
      },
    });

    const credit = await prisma.therapyCredit.findUnique({
      where: { patientId: patient.id },
    });
    const balance = Number(credit?.balance ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        profile: { fullName: patient.profile?.fullName ?? patient.fullName },
        firstName: firstName(patient.profile?.fullName ?? patient.fullName),
        upcomingSession: upcomingSession
          ? toSessionJson(upcomingSession)
          : null,
        recentSessions: recentBookings.map(toSessionJson),
        credits: {
          balance,
          tier: tierFromBalance(balance),
        },
        totalSessions,
        mergedFromGuest,
        mergedSessionCount,
      },
    });
  } catch (e) {
    console.error("client dashboard:", e);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
