export const REFERRAL_STORAGE_KEY = "ealho_referral_code";
export const REFERRAL_EXPIRY_KEY = "ealho_referral_expiry";
export const REFERRAL_WINDOW_DAYS = 30;

export function captureReferralCode(code: string) {
  if (typeof window === "undefined") return;
  const expiry = Date.now() + REFERRAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(REFERRAL_STORAGE_KEY, code.trim().toUpperCase());
  localStorage.setItem(REFERRAL_EXPIRY_KEY, String(expiry));
}

export function getReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
  const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);
  if (!code || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
    return null;
  }
  return code;
}

export function clearReferralCode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem(REFERRAL_EXPIRY_KEY);
}
