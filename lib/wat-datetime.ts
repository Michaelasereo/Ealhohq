/** West Africa Time (Africa/Lagos, UTC+1) helpers for booking and display. */

export function formatWAT(iso: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function minutesUntil(startIso: string) {
  return Math.floor((new Date(startIso).getTime() - Date.now()) / (1000 * 60));
}

/** Calendar day of month (1–31) in Africa/Lagos. */
export function watCalendarDay(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      day: "numeric",
    }).format(now),
  );
}

/** Current month as YYYY-MM in West Africa Time (pool / allocation keys). */
export function watCurrentMonthYm(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

/** Today's calendar date YYYY-MM-DD in WAT. */
export function watTodayDateString(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Monday = 0 … Sunday = 6 (matches Prisma `dayOfWeek` on availability).
 * `dateStr` is YYYY-MM-DD interpreted as a calendar day in WAT.
 */
export function watDayOfWeekMon0(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00+01:00`);
  const dow = d.getUTCDay();
  return (dow + 6) % 7;
}

/** Minutes since local WAT midnight for "now". */
export function nowWatMinutesFromMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

export function slotToMinutes(slot: string): number {
  const [h, min] = slot.split(":").map(Number);
  return h * 60 + min;
}

/** Civil YYYY-MM-DD of a stored booking `date` in WAT. */
export function bookingDateToWatYmd(bookingDate: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(bookingDate);
}

/** ISO string for booking start instant in WAT (for display / minutesUntil). */
export function bookingDateStartToIso(bookingDate: Date, startTime: string): string {
  const ymd = bookingDateToWatYmd(bookingDate);
  return `${ymd}T${startTime}:00+01:00`;
}

/** Start of civil day in WAT as stored/compared with availability queries. */
export function watDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+01:00`);
}

export function watDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+01:00`);
}

/** Add whole days to a YYYY-MM-DD interpreted in WAT. */
export function addWatDays(dateStr: string, delta: number): string {
  const t = new Date(`${dateStr}T12:00:00+01:00`);
  const ms = t.getTime() + delta * 86_400_000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export function getCalendarCells(
  year: number,
  month1to12: number,
): { ymd: string; inMonth: boolean }[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const first = `${year}-${pad(month1to12)}-01`;
  const lead = watDayOfWeekMon0(first);
  let cur = addWatDays(first, -lead);
  const prefix = `${year}-${pad(month1to12)}`;
  const cells: { ymd: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push({ ymd: cur, inMonth: cur.startsWith(prefix) });
    cur = addWatDays(cur, 1);
  }
  return cells;
}
