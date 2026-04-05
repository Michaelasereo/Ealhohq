/** Same-day end time from start "HH:mm" and duration in minutes. */
export function endTimeFromStart(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const endMins = h * 60 + m + durationMinutes;
  const eh = Math.floor(endMins / 60) % 24;
  const em = endMins % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}
