import { watDayEnd, watDayStart } from "@/lib/wat-datetime";

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export function generateSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  bufferMinutes: number,
): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  let current = startH * 60 + startM;
  const end = endH * 60 + endM;
  const step = durationMinutes + bufferMinutes;

  while (current + durationMinutes <= end) {
    const hours = Math.floor(current / 60);
    const mins = current % 60;
    slots.push(
      `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
    );
    current += step;
  }

  return slots;
}

export async function getAvailableSlots(
  therapistId: string,
  dateStr: string,
): Promise<string[]> {
  const { prisma } = await import("@/lib/prisma/client");
  const {
    watDayOfWeekMon0,
    watTodayDateString,
    nowWatMinutesFromMidnight,
    slotToMinutes,
  } = await import("@/lib/wat-datetime");

  const dayIndex = watDayOfWeekMon0(dateStr);

  const override = await prisma.therapyAvailabilityOverride.findFirst({
    where: {
      therapistId,
      date: {
        gte: watDayStart(dateStr),
        lte: watDayEnd(dateStr),
      },
    },
  });

  if (override?.isBlocked) return [];

  const schedule = await prisma.therapyAvailabilitySchedule.findFirst({
    where: {
      therapistId,
      dayOfWeek: dayIndex,
      isActive: true,
    },
  });

  if (!schedule) return [];

  const startTime = override?.startTime ?? schedule.startTime;
  const endTime = override?.endTime ?? schedule.endTime;

  const allSlots = generateSlots(
    startTime,
    endTime,
    schedule.sessionDurationMinutes,
    schedule.bufferMinutes,
  );

  const booked = await prisma.therapyBooking.findMany({
    where: {
      therapistId,
      date: {
        gte: watDayStart(dateStr),
        lte: watDayEnd(dateStr),
      },
      status: { in: ["confirmed", "pending"] },
    },
    select: { startTime: true },
  });

  const bookedTimes = new Set(booked.map((b) => b.startTime));

  const todayStr = watTodayDateString();
  const isToday = dateStr === todayStr;
  const minNoticeMinutes = schedule.minimumNoticeHours * 60;
  const nowMin = nowWatMinutesFromMidnight();

  return allSlots.filter((slot) => {
    if (bookedTimes.has(slot)) return false;
    if (isToday) {
      const slotMin = slotToMinutes(slot);
      if (slotMin < nowMin + minNoticeMinutes) return false;
    }
    return true;
  });
}
