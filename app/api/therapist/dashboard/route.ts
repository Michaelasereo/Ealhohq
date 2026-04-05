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
import { watCurrentMonthStart } from "@/lib/wat-month";

export async function GET() {
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
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    }

    const todayYmd = watTodayDateString();
    const todayStart = watDayStart(todayYmd);
    const todayEnd = watDayEnd(todayYmd);
    const weekEndYmd = addWatDays(todayYmd, 7);
    const weekEnd = watDayEnd(weekEndYmd);
    const monthStart = watCurrentMonthStart();

    const [todaySessions, upcomingSessions, sessionsThisWeek, totalClients, monthBookings, pendingNotes] =
      await Promise.all([
        prisma.therapyBooking.findMany({
          where: {
            therapistId: therapist.id,
            date: { gte: todayStart, lte: todayEnd },
            status: { in: ["confirmed", "completed"] },
          },
          include: {
            patient: { select: { fullName: true, email: true } },
            session: {
              select: {
                id: true,
                status: true,
                notesGenerated: true,
                sessionNumber: true,
              },
            },
          },
          orderBy: { startTime: "asc" },
        }),
        prisma.therapyBooking.findMany({
          where: {
            therapistId: therapist.id,
            date: { gt: todayEnd, lte: weekEnd },
            status: "confirmed",
          },
          include: {
            patient: { select: { fullName: true } },
            session: {
              select: {
                id: true,
                sessionNumber: true,
                notesGenerated: true,
                status: true,
              },
            },
          },
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
        prisma.therapyBooking.findMany({
          where: {
            therapistId: therapist.id,
            date: { gte: monthStart },
            paymentStatus: "paid",
          },
          select: { id: true },
        }),
        prisma.therapySessionNote.count({
          where: {
            therapistId: therapist.id,
            isEdited: false,
            session: { notesGenerated: true },
          },
        }),
      ]);

    const rate = Number(therapist.sessionRate);
    const earningsThisMonth = monthBookings.length * rate;

    const fullName = therapist.profile.fullName?.trim() ?? "";
    const therapistFirstName = fullName.split(/\s+/)[0] ?? "there";

    return NextResponse.json({
      success: true,
      data: {
        therapist: {
          id: therapist.id,
          status: therapist.status,
          sessionRate: rate,
          sessionDuration: therapist.sessionDuration,
          profilePhoto: therapist.profilePhoto,
          therapistFirstName,
        },
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
