import { minutesUntilSessionStart } from "@/lib/session/join-access";

/** Join button active only in the 10 minutes before scheduled start (WAT). */
export function canJoinSessionTenMinutesBefore(
  date: Date,
  startTime: string,
): boolean {
  const m = minutesUntilSessionStart(date, startTime);
  return m <= 10 && m >= 0;
}

/** Whole minutes until the 10-minute pre-start join window opens (0 when inside or past). */
export function minutesUntilJoinWindow(date: Date, startTime: string): number {
  const m = minutesUntilSessionStart(date, startTime);
  if (m <= 10) return 0;
  return m - 10;
}
