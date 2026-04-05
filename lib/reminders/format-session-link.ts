export function sessionJoinUrl(bookingId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  return `${base}/session/join?bookingId=${encodeURIComponent(bookingId)}`;
}
