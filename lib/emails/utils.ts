export function durationMinutesFromSlot(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + (sm || 0);
  const end = eh * 60 + (em || 0);
  return Math.max(0, end - start);
}

export function formatDurationLabel(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes === 60) return "1 hour";
  if (minutes > 60 && minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

export function getAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "https://ealho.com"
  );
}
