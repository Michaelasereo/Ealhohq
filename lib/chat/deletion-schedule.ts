/** Grace period before encrypted chat content is purged (calendar days). */
export function chatDeletionGraceDays(): number {
  const raw = process.env.CHAT_DELETION_GRACE_DAYS?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 1 && n <= 365) return n;
  return 30;
}

export function deletionScheduledAtFromNow(now = new Date()): Date {
  const ms = chatDeletionGraceDays() * 86_400_000;
  return new Date(now.getTime() + ms);
}
