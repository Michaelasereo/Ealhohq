/**
 * Therapist-facing client label for a booking (never exposes real guest name when anonymous).
 */
export function getDisplayName(booking: {
  isAnonymous: boolean;
  clientAlias: string | null;
  guestName: string | null;
  patient: { fullName: string } | null;
}): string {
  if (booking.isAnonymous) {
    const a =
      booking.clientAlias?.trim() || booking.guestName?.trim() || "";
    return a || "Anonymous Client";
  }
  if (booking.patient) {
    return booking.patient.fullName;
  }
  return booking.guestName?.trim() || "Guest";
}

/** Short stable label derived from booking id (e.g. Client A1B2C3). */
export function getClientId(bookingId: string): string {
  return `Client ${bookingId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
