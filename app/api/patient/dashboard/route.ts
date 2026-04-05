import { NextResponse } from "next/server";

import { tierFromBalance } from "@/lib/credits/purchase-config";
import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { bookingDateStartToIso } from "@/lib/wat-datetime";
import { watDayStart, watTodayDateString } from "@/lib/wat-datetime";

function firstName(fullName: string) {
  const t = fullName.trim();
  return t.split(/\s+/)[0] ?? t;
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

    const profile = await prisma.sharedProfile.findUnique({
      where: { id: user.id },
    });

    const patient = await getPatientByProfileId(user.id);

    if (!patient) {
      return NextResponse.json({
        success: true,
        data: {
          profile: { fullName: profile?.fullName ?? "" },
          firstName: profile ? firstName(profile.fullName) : "there",
          upcomingSession: null,
          recentSessions: [],
          credits: { balance: 0, tier: tierFromBalance(0) },
          totalSessions: 0,
        },
      });
    }

    const todayStart = watDayStart(watTodayDateString());
    const nowMs = Date.now();

    const confirmedBookings = await prisma.therapyBooking.findMany({
      where: {
        patientId: patient.id,
        status: "confirmed",
        date: { gte: todayStart },
      },
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

    const totalSessions = await prisma.therapyBooking.count({
      where: {
        patientId: patient.id,
        status: { in: ["confirmed", "completed"] },
      },
    });

    const credit = await prisma.therapyCredit.findUnique({
      where: { patientId: patient.id },
    });
    const balance = credit?.balance ?? 0;

    const toJson = (b: (typeof recentBookings)[0]) => ({
      id: b.id,
      date: b.date.toISOString(),
      startTime: b.startTime,
      endTime: b.endTime,
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
            feedbackSubmitted:
              "feedbacks" in b.session &&
              Array.isArray(b.session.feedbacks) &&
              b.session.feedbacks.length > 0,
          }
        : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        profile: { fullName: patient.profile?.fullName ?? patient.fullName },
        firstName: firstName(patient.profile?.fullName ?? patient.fullName),
        upcomingSession: upcomingSession ? toJson(upcomingSession) : null,
        recentSessions: recentBookings.map(toJson),
        credits: {
          balance,
          tier: tierFromBalance(balance),
        },
        totalSessions,
      },
    });
  } catch (e) {
    console.error("patient/dashboard:", e);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
