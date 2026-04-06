/**
 * Gmail ignores dots in the local part. Used to match guest bookings to signup email.
 */
export function canonicalEmailForGuestMatch(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return e;
  let local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

export function isGoogleHostedConsumerDomain(email: string): boolean {
  const d = email.trim().toLowerCase().split("@")[1];
  return d === "gmail.com" || d === "googlemail.com";
}
