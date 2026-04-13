import { NextResponse } from "next/server";

import { DEFAULT_THERAPIST_PERCENT } from "@/lib/defaults/earnings-split";
import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import {
  addWatDays,
  watDayStart,
  watTodayDateString,
} from "@/lib/wat-datetime";
import { watCurrentMonthStart } from "@/lib/wat-month";
import { getDisplayName } from "@/lib/utils/patient-display";

import { captureApiError } from "@/lib/sentry/capture";
function shareForSession(
  therapistEarnings: unknown,
  sessionRateNgn: number,
  therapistPercent: number,
): { yourShare: number; platformShare: number } {
  if (therapistEarnings != null && therapistEarnings !== "") {
    const your = Number(therapistEarnings);
    const full = sessionRateNgn;
    const platform = Math.round((full - your) * 100) / 100;
    return { yourShare: your, platformShare: platform };
  }
  const yourShare =
    Math.round(((sessionRateNgn * therapistPercent) / 100) * 100) / 100;
  const platformShare =
    Math.round((sessionRateNgn - yourShare) * 100) / 100;
  return { yourShare, platformShare };
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

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cfg = await prisma.earningsConfig.findUnique({
      where: { therapistId: therapist.id },
    });
    const therapistPercent = cfg
      ? Number(cfg.therapistPercent)
      : DEFAULT_THERAPIST_PERCENT;
    const platformPercent = cfg
      ? Number(cfg.platformPercent)
      : 100 - therapistPercent;

    const monthStart = watCurrentMonthStart();
    const todayYmd = watTodayDateString();
    const weekStartYmd = addWatDays(todayYmd, -7);
    const weekStart = watDayStart(weekStartYmd);

    const rows = await prisma.therapySession.findMany({
      where: {
        therapistId: therapist.id,
        status: "completed",
        booking: { paymentStatus: "paid" },
      },
      include: {
        booking: {
          include: {
            patient: { select: { fullName: true } },
            therapist: { select: { sessionRate: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const list: {
      id: string;
      bookingId: string;
      date: string;
      patientName: string;
      sessionType: string;
      sessionRateFull: number;
      therapistEarnings: number;
      platformEarnings: number;
    }[] = [];

    let totalAllTime = 0;
    let thisMonth = 0;
    let thisWeek = 0;

    for (const s of rows) {
      const b = s.booking;
      const rate = Number(b.therapist.sessionRate);
      const { yourShare, platformShare } = shareForSession(
        s.therapistEarnings,
        rate,
        therapistPercent,
      );
      totalAllTime += yourShare;
      if (b.date >= monthStart) thisMonth += yourShare;
      if (b.date >= weekStart) thisWeek += yourShare;
      list.push({
        id: s.id,
        bookingId: b.id,
        date: b.date.toISOString(),
        patientName: getDisplayName({
          isAnonymous: b.isAnonymous,
          clientAlias: b.clientAlias,
          guestName: b.guestName,
          patient: b.patient,
        }),
        sessionType: b.sessionType,
        sessionRateFull: rate,
        therapistEarnings: yourShare,
        platformEarnings: platformShare,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionRate: Number(therapist.sessionRate),
        therapistPercent,
        platformPercent,
        totals: {
          allTime: Math.round(totalAllTime * 100) / 100,
          thisMonth: Math.round(thisMonth * 100) / 100,
          thisWeek: Math.round(thisWeek * 100) / 100,
        },
        sessions: list,
      },
    });
  } catch (e) {
    console.error("therapist/earnings GET:", e);
    captureApiError(e, { route: "/therapist/earnings" });
    return NextResponse.json(
      { error: "Failed to load earnings" },
      { status: 500 },
    );
  }
}
