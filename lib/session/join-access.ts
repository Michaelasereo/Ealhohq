import { bookingDateStartToIso } from "@/lib/wat-datetime";

/** Minutes from scheduled start (negative = before start). */
export function minutesUntilSessionStart(
  date: Date,
  startTime: string,
): number {
  const iso = bookingDateStartToIso(date, startTime);
  return Math.floor((new Date(iso).getTime() - Date.now()) / 60_000);
}

/** Join allowed from 10 minutes before start until 30 minutes after scheduled end (same WAT day). */
export function canJoinSessionWindow(
  date: Date,
  startTime: string,
  endTime: string,
): boolean {
  const startMs = new Date(bookingDateStartToIso(date, startTime)).getTime();
  const [sh, smin] = startTime.split(":").map(Number);
  const [eh, emin] = endTime.split(":").map(Number);
  let durMin = eh * 60 + emin - (sh * 60 + smin);
  if (durMin < 0) durMin += 24 * 60;
  const endMs = startMs + durMin * 60_000;
  const now = Date.now();
  return now >= startMs - 10 * 60_000 && now <= endMs + 30 * 60_000;
}
