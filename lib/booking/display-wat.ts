/** `dateStr` = YYYY-MM-DD (WAT calendar day). */
export function formatWatLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+01:00`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(d);
}

/** `slot` = "HH:mm" wall time in WAT. */
export function formatSlot12hWat(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm} WAT`;
}

/** Calendar day for templates (e.g. "Monday, 14 April 2026"). */
export function formatBookingDateLong(date: Date | string): string {
  const dateStr =
    typeof date === "string"
      ? date.slice(0, 10)
      : date.toISOString().slice(0, 10);
  return formatWatLongDate(dateStr);
}

/** Time only for templates (e.g. "9:00 AM"); add " WAT" in copy where needed. */
export function formatSlotTo12h(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}
