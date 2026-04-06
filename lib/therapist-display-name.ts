/** Strip leading Dr. / Dr (case-insensitive) from a stored display name. */
export function stripTherapistHonorific(name: string): string {
  return name.replace(/^dr\.?\s+/i, "").trim();
}

/** First token after honorific strip — for in-app greetings to therapists (e.g. “Hi Amaka”). */
export function therapistFirstNameForGreeting(
  fullName: string | null | undefined,
): string {
  const base = stripTherapistHonorific((fullName ?? "").trim());
  return base.split(/\s+/)[0] || "there";
}

const LICENSED_SUFFIX = ", Licensed Therapist";

/**
 * Client- and public-facing therapist label. Avoids “Dr.”; strips an existing Dr. prefix
 * so we do not show “Dr. Jane, Licensed Therapist”. Idempotent if the suffix is already present.
 */
export function therapistPublicLabel(fullName: string | null | undefined): string {
  const raw = (fullName ?? "").trim();
  if (!raw) return "Licensed Therapist";
  if (raw.toLowerCase().endsWith(LICENSED_SUFFIX.toLowerCase())) {
    return raw;
  }
  const base = stripTherapistHonorific(raw);
  if (!base) return "Licensed Therapist";
  return `${base}${LICENSED_SUFFIX}`;
}
