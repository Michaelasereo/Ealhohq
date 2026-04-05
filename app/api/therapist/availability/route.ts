import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { watDayStart, watTodayDateString } from "@/lib/wat-datetime";

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

    const todayStart = watDayStart(watTodayDateString());

    const [schedule, overrides] = await Promise.all([
      prisma.therapyAvailabilitySchedule.findMany({
        where: { therapistId: therapist.id },
        orderBy: { dayOfWeek: "asc" },
      }),
      prisma.therapyAvailabilityOverride.findMany({
        where: {
          therapistId: therapist.id,
          date: { gte: todayStart },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        schedule,
        overrides,
      },
    });
  } catch (e) {
    console.error("therapist/availability GET:", e);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 },
    );
  }
}

type ScheduleRow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sessionDurationMinutes: number;
  bufferMinutes: number;
  isActive?: boolean;
};

export async function POST(req: Request) {
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

    const body = (await req.json()) as { schedule?: ScheduleRow[] };
    const schedule = Array.isArray(body.schedule) ? body.schedule : [];

    await prisma.therapyAvailabilitySchedule.deleteMany({
      where: { therapistId: therapist.id },
    });

    if (schedule.length > 0) {
      await prisma.therapyAvailabilitySchedule.createMany({
        data: schedule.map((s) => ({
          therapistId: therapist.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          sessionDurationMinutes: s.sessionDurationMinutes,
          bufferMinutes: s.bufferMinutes,
          bookingWindowWeeks: 4,
          minimumNoticeHours: 2,
          isActive: s.isActive !== false,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("therapist/availability POST:", e);
    return NextResponse.json(
      { error: "Failed to save availability" },
      { status: 500 },
    );
  }
}
