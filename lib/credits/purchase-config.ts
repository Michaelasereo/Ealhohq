export type CreditPackageKey = "bronze" | "silver" | "gold" | "platinum";

export const CREDIT_PACKAGE_PAYSTACK: Record<
  CreditPackageKey,
  { credits: number; amountKobo: number }
> = {
  bronze: { credits: 2, amountKobo: 2_800_000 },
  silver: { credits: 4, amountKobo: 5_400_000 },
  gold: { credits: 8, amountKobo: 10_000_000 },
  platinum: { credits: 12, amountKobo: 14_400_000 },
};

export function tierFromBalance(balance: number): CreditPackageKey {
  if (balance <= 2) return "bronze";
  if (balance <= 5) return "silver";
  if (balance <= 9) return "gold";
  return "platinum";
}
