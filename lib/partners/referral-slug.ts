/** Normalise corporate referral slug (uppercase, safe chars, max 32). */
export function normalizeSuperReferralSlug(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .toUpperCase()
    .slice(0, 32);
}

export function slugFromPartnerName(name: string): string {
  const s = name
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase()
    .slice(0, 24);
  return s || "PARTNER";
}
