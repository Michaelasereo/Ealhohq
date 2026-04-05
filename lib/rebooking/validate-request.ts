import { getAvailableSlots } from "@/lib/availability/slots";
import { prisma } from "@/lib/prisma/client";
import {
  addWatDays,
  bookingDateToWatYmd,
  watDayOfWeekMon0,
  watTodayDateString,
} from "@/lib/wat-datetime";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function patientHasBookingWithTherapist(
  patientId: string,
  therapistId: string,
): Promise<boolean> {
  const n = await prisma.therapyBooking.count({
    where: {
      patientId,
      therapistId,
      status: { in: ["confirmed", "completed", "pending"] },
    },
  });
  return n > 0;
}

export async function assertRebookSlotValid(params: {
  therapistId: string;
  dateYmd: string;
  startTime: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { therapistId, dateYmd, startTime } = params;
  if (!DATE_RE.test(dateYmd) || !TIME_RE.test(startTime)) {
    return { ok: false, error: "Invalid date or time" };
  }

  const today = watTodayDateString();
  if (dateYmd < today) {
    return { ok: false, error: "Date must be today or later" };
  }

  const dayIndex = watDayOfWeekMon0(dateYmd);
  const schedule = await prisma.therapyAvailabilitySchedule.findFirst({
    where: { therapistId, dayOfWeek: dayIndex, isActive: true },
  });
  if (!schedule) {
    return { ok: false, error: "Therapist has no availability that day" };
  }

  const maxDate = addWatDays(today, schedule.bookingWindowWeeks * 7);
  if (dateYmd > maxDate) {
    return { ok: false, error: "Date is outside the booking window" };
  }

  const slots = await getAvailableSlots(therapistId, dateYmd);
  if (!slots.includes(startTime)) {
    return { ok: false, error: "This time slot is not available" };
  }

  return { ok: true };
}

export function bookingEndTime(
  startTime: string,
  durationMinutes: number,
): string {
  const [h, m] = startTime.split(":").map(Number);
  const startMins = h * 60 + m;
  const endMins = startMins + durationMinutes;
  return `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;
}

export function ymdFromSuggestedDate(d: Date): string {
  return bookingDateToWatYmd(d);
}
