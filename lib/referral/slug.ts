/** URL-safe slug: lowercase, hyphens, alphanumerics only. */
export function slugifyReferralName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "partner";
}

/** Suggest referral code: FIRSTWORD + CLINIC (uppercase, alphanumeric). */
export function suggestReferralCodeFromName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "CLINIC";
  const cleaned = first.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const base = (cleaned || "CLINIC") + "CLINIC";
  return base.slice(0, 32);
}
