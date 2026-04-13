import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import {
  addWatDays,
  watDayEnd,
  watDayStart,
  watTodayDateString,
} from "@/lib/wat-datetime";
import { therapistFirstNameForGreeting } from "@/lib/therapist-display-name";
import { watCurrentMonthStart } from "@/lib/wat-month";

import { captureApiError } from "@/lib/sentry/capture";
const therapistDashboardBookingSelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
  sessionType: true,
  isAnonymous: true,
  patient: { select: { fullName: true, email: true } },
  session: {
    select: {
      id: true,
      status: true,
      notesGenerated: true,
      sessionNumber: true,
    },
  },
} as const;

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

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    }

    const todayYmd = watTodayDateString();
    const todayStart = watDayStart(todayYmd);
    const todayEnd = watDayEnd(todayYmd);
    const weekEndYmd = addWatDays(todayYmd, 7);
    const weekEnd = watDayEnd(weekEndYmd);
    const monthStart = watCurrentMonthStart();

    const rate = Number(therapist.sessionRate);
    const fullName = therapist.profile.fullName?.trim() ?? "";
    const therapistFirstName = therapistFirstNameForGreeting(fullName);

    const therapistPayload = {
      id: therapist.id,
      status: therapist.status,
      sessionRate: rate,
      sessionDuration: therapist.sessionDuration,
      profilePhoto: therapist.profilePhoto,
      therapistFirstName,
    };

    if (zone === "stats") {
      const [
        sessionsToday,
        sessionsThisWeek,
        totalClients,
        monthEarningsAgg,
        pendingNotes,
      ] = await Promise.all([
        prisma.therapyBooking.count({
          where: {
            therapistId: therapist.id,
            date: { gte: todayStart, lte: todayEnd },
            status: { in: ["confirmed", "completed"] },
          },
        }),
        prisma.therapyBooking.count({
          where: {
            therapistId: therapist.id,
            date: { gte: todayStart, lte: weekEnd },
            status: { in: ["confirmed", "completed"] },
          },
        }),
        prisma.therapyPatient.count({
          where: {
            bookings: { some: { therapistId: therapist.id } },
          },
        }),
        prisma.therapySession.aggregate({
          where: {
            therapistId: therapist.id,
            status: "completed",
            booking: {
              paymentStatus: "paid",
              date: { gte: monthStart },
            },
          },
          _sum: { therapistEarnings: true },
        }),
        prisma.therapySessionNote.count({
          where: {
            therapistId: therapist.id,
            isEdited: false,
            session: { notesGenerated: true },
          },
        }),
      ]);

      const earningsThisMonth = Number(
        monthEarningsAgg._sum.therapistEarnings ?? 0,
      );

      return NextResponse.json({
        success: true,
        data: {
          therapist: therapistPayload,
          stats: {
            sessionsToday,
            sessionsThisWeek,
            totalClients,
            earningsThisMonth,
            pendingNotes,
          },
        },
      });
    }

    if (zone === "today") {
      const todaySessions = await prisma.therapyBooking.findMany({
        where: {
          therapistId: therapist.id,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ["confirmed", "completed"] },
        },
        select: therapistDashboardBookingSelect,
        orderBy: { startTime: "asc" },
      });
      return NextResponse.json({
        success: true,
        data: { todaySessions },
      });
    }

    if (zone === "upcoming") {
      const upcomingSessions = await prisma.therapyBooking.findMany({
        where: {
          therapistId: therapist.id,
          date: { gt: todayEnd, lte: weekEnd },
          status: "confirmed",
        },
        select: therapistDashboardBookingSelect,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 10,
      });
      return NextResponse.json({
        success: true,
        data: { upcomingSessions },
      });
    }

    const [todaySessions, upcomingSessions, sessionsThisWeek, totalClients, monthEarningsAgg, pendingNotes] =
      await Promise.all([
        prisma.therapyBooking.findMany({
          where: {
            therapistId: therapist.id,
            date: { gte: todayStart, lte: todayEnd },
            status: { in: ["confirmed", "completed"] },
          },
          select: therapistDashboardBookingSelect,
          orderBy: { startTime: "asc" },
        }),
        prisma.therapyBooking.findMany({
          where: {
            therapistId: therapist.id,
            date: { gt: todayEnd, lte: weekEnd },
            status: "confirmed",
          },
          select: therapistDashboardBookingSelect,
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
          take: 10,
        }),
        prisma.therapyBooking.count({
          where: {
            therapistId: therapist.id,
            date: { gte: todayStart, lte: weekEnd },
            status: { in: ["confirmed", "completed"] },
          },
        }),
        prisma.therapyPatient.count({
          where: {
            bookings: { some: { therapistId: therapist.id } },
          },
        }),
        prisma.therapySession.aggregate({
          where: {
            therapistId: therapist.id,
            status: "completed",
            booking: {
              paymentStatus: "paid",
              date: { gte: monthStart },
            },
          },
          _sum: { therapistEarnings: true },
        }),
        prisma.therapySessionNote.count({
          where: {
            therapistId: therapist.id,
            isEdited: false,
            session: { notesGenerated: true },
          },
        }),
      ]);

    const earningsThisMonth = Number(
      monthEarningsAgg._sum.therapistEarnings ?? 0,
    );

    return NextResponse.json({
      success: true,
      data: {
        therapist: therapistPayload,
        stats: {
          sessionsToday: todaySessions.length,
          sessionsThisWeek,
          totalClients,
          earningsThisMonth,
          pendingNotes,
        },
        todaySessions,
        upcomingSessions,
      },
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    captureApiError(e, { route: "/therapist/dashboard" });
    const message =
      e instanceof Error ? e.message : "Failed to load dashboard";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Failed to load dashboard",
      },
      { status: 500 },
    );
  }
}
