export function getBookingRecipientEmail(booking: {
  guestEmail?: string | null;
  patient?: { email: string } | null;
}): string | null {
  const g = booking.guestEmail?.trim();
  if (g) return g;
  return booking.patient?.email?.trim() ?? null;
}
