import {
  CREDIT_PACKAGE_PAYSTACK,
  type CreditPackageKey,
} from "@/lib/credits/purchase-config";

/**
 * Per-session list price is ₦20,000 (therapist `sessionRate`). Bundle totals and Paystack
 * charges live in `CREDIT_PACKAGE_PAYSTACK` — keep display in sync by building from that map.
 */
const ORDER: CreditPackageKey[] = ["bronze", "silver", "gold", "platinum"];

const DISPLAY_NAME: Record<CreditPackageKey, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const SAVE_LABEL: Record<CreditPackageKey, string> = {
  bronze: "5%",
  silver: "10%",
  gold: "15%",
  platinum: "20%",
};

function formatNgnFromKobo(amountKobo: number): string {
  const ngn = amountKobo / 100;
  return `₦${ngn.toLocaleString("en-NG")}`;
}

export const CREDIT_PACKAGES = ORDER.map((key) => {
  const { credits, amountKobo } = CREDIT_PACKAGE_PAYSTACK[key];
  return {
    name: DISPLAY_NAME[key],
    sessions: credits,
    price: formatNgnFromKobo(amountKobo),
    save: SAVE_LABEL[key],
  };
});
