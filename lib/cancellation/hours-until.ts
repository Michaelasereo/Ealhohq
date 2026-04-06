import { bookingDateStartToIso } from "@/lib/wat-datetime";

export function hoursUntilSessionStart(date: Date, startTime: string): number {
  const startIso = bookingDateStartToIso(date, startTime);
  return (new Date(startIso).getTime() - Date.now()) / (1000 * 60 * 60);
}
