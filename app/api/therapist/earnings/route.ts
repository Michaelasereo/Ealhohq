import { NextResponse } from "next/server";

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

    const rate = Number(therapist.sessionRate);
    const monthStart = watCurrentMonthStart();
    const todayYmd = watTodayDateString();
    const weekStartYmd = addWatDays(todayYmd, -7);
    const weekStart = watDayStart(weekStartYmd);

    const paid = await prisma.therapyBooking.findMany({
      where: {
        therapistId: therapist.id,
        status: "completed",
        paymentStatus: "paid",
      },
      include: {
        patient: { select: { fullName: true } },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 100,
    });

    const totalAllTime = paid.length * rate;
    const thisMonth = paid.filter((b) => b.date >= monthStart).length * rate;
    const thisWeek = paid.filter((b) => b.date >= weekStart).length * rate;

    return NextResponse.json({
      success: true,
      data: {
        sessionRate: rate,
        totals: {
          allTime: totalAllTime,
          thisMonth,
          thisWeek,
        },
        sessions: paid.map((b) => ({
          id: b.id,
          date: b.date.toISOString(),
          patientName: getDisplayName({
            isAnonymous: b.isAnonymous,
            clientAlias: b.clientAlias,
            guestName: b.guestName,
            patient: b.patient,
          }),
          sessionType: b.sessionType,
          amount: rate,
        })),
      },
    });
  } catch (e) {
    console.error("therapist/earnings GET:", e);
    return NextResponse.json(
      { error: "Failed to load earnings" },
      { status: 500 },
    );
  }
}
