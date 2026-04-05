import { addWatDays, watTodayDateString } from "@/lib/wat-datetime";

import type { NextSlotPick } from "@/lib/availability/next-slots";

export type QuickRebookSlotDto = NextSlotPick & {
  displayDate: string;
  displayTime: string;
};

function formatDisplayTime(time24: string): string {
  const iso = `2000-01-01T${time24}:00+01:00`;
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function formatDisplayDate(ymd: string): string {
  const today = watTodayDateString();
  const tomorrow = addWatDays(today, 1);
  const d = new Date(`${ymd}T12:00:00+01:00`);
  const weekday = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    timeZone: "Africa/Lagos",
  }).format(d);
  const dayMonth = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(d);
  if (ymd === tomorrow) {
    return `Tomorrow · ${weekday} ${dayMonth}`;
  }
  if (ymd === today) {
    return `Today · ${weekday} ${dayMonth}`;
  }
  return `${weekday} ${dayMonth}`;
}

export function enrichSlotsForQuickRebook(slots: NextSlotPick[]): QuickRebookSlotDto[] {
  return slots.map((s) => ({
    ...s,
    displayDate: formatDisplayDate(s.date),
    displayTime: `${formatDisplayTime(s.time)} WAT`,
  }));
}
