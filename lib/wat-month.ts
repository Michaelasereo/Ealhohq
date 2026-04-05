import { watDayStart } from "@/lib/wat-datetime";

/** First instant of the current calendar month in WAT (Africa/Lagos). */
export function watCurrentMonthStart(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return watDayStart(`${y}-${m}-01`);
}
