import { slotToMinutes, watDayOfWeekMon0 } from "@/lib/wat-datetime";

export type DaySchedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sessionDurationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
};

/**
 * Returns "HH:mm" slot start times that fit in the schedule for the given date.
 */
export function slotsForPsychiatristDay(
  dateYmd: string,
  schedules: DaySchedule[],
): string[] {
  const dow = watDayOfWeekMon0(dateYmd);
  const row = schedules.find((s) => s.dayOfWeek === dow && s.isActive);
  if (!row) return [];

  const step = row.sessionDurationMinutes + row.bufferMinutes;
  const out: string[] = [];
  let cur = slotToMinutes(row.startTime);
  const end = slotToMinutes(row.endTime);
  while (cur + row.sessionDurationMinutes <= end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += step;
  }
  return out;
}

export function endTimeForSlot(startTime: string, durationMins: number): string {
  const m = slotToMinutes(startTime) + durationMins;
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
