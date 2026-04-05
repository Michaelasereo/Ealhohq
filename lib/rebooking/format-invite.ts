import { bookingDateStartToIso } from "@/lib/wat-datetime";

export function formatLongDateWAT(date: Date, startTime: string): string {
  const iso = bookingDateStartToIso(date, startTime);
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function formatTimeAmPmWAT(date: Date, startTime: string): string {
  const iso = bookingDateStartToIso(date, startTime);
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}
