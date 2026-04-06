export type CreditPackageKey = "bronze" | "silver" | "gold" | "platinum";

export const CREDIT_PACKAGE_PAYSTACK: Record<
  CreditPackageKey,
  { credits: number; amountKobo: number }
> = {
  bronze: { credits: 2, amountKobo: 3_800_000 },
  silver: { credits: 4, amountKobo: 7_200_000 },
  gold: { credits: 8, amountKobo: 13_600_000 },
  platinum: { credits: 12, amountKobo: 19_200_000 },
};

export function tierFromBalance(balance: number): CreditPackageKey {
  if (balance <= 2) return "bronze";
  if (balance <= 5) return "silver";
  if (balance <= 9) return "gold";
  return "platinum";
}
