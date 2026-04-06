export interface PackageOption {
  id: string;
  label: string;
  sessions: number;
  discountPercent: number;
  tag?: string;
  description: string;
}

export const PACKAGE_OPTIONS: PackageOption[] = [
  {
    id: "single",
    label: "Single Session",
    sessions: 1,
    discountPercent: 0,
    description: "One session. Pay as you go.",
  },
  {
    id: "package_4",
    label: "4-Session Package",
    sessions: 4,
    discountPercent: 10,
    tag: "Popular",
    description: "Commit to 4 sessions and save 10%.",
  },
  {
    id: "package_6",
    label: "6-Session Package",
    sessions: 6,
    discountPercent: 13,
    tag: "Best Value",
    description: "Recommended for ongoing therapy work.",
  },
  {
    id: "package_8",
    label: "8-Session Package",
    sessions: 8,
    discountPercent: 17,
    description: "Maximum savings for committed therapy.",
  },
];

export function getPackageOption(packageId: string): PackageOption {
  return (
    PACKAGE_OPTIONS.find((p) => p.id === packageId) ??
    PACKAGE_OPTIONS[0]
  );
}

export function calculatePackagePrice(
  sessionRate: number,
  packageOption: PackageOption,
): {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  pricePerSession: number;
  savingsText: string;
} {
  const originalPrice = sessionRate * packageOption.sessions;
  const discountAmount = Math.round(
    originalPrice * (packageOption.discountPercent / 100),
  );
  const finalPrice = originalPrice - discountAmount;
  const pricePerSession = Math.round(finalPrice / packageOption.sessions);

  return {
    originalPrice,
    discountAmount,
    finalPrice,
    pricePerSession,
    savingsText:
      discountAmount > 0 ? `Save ₦${discountAmount.toLocaleString()}` : "",
  };
}

/**
 * When the purchased sessions must be used by (for `therapy_session_packages.expiresAt`).
 * Single: 2 weeks · 4 & 6-session packs: 2 months · 8-session pack: 3 months.
 */
export function getPackageExpiry(packageType: string): Date {
  const id = getPackageOption(packageType).id;
  const d = new Date();
  switch (id) {
    case "single":
      d.setDate(d.getDate() + 14);
      return d;
    case "package_4":
    case "package_6":
      d.setMonth(d.getMonth() + 2);
      return d;
    case "package_8":
      d.setMonth(d.getMonth() + 3);
      return d;
    default:
      d.setMonth(d.getMonth() + 2);
      return d;
  }
}

/** Short copy for booking UI (e.g. package picker). */
export function getPackageValidityLabel(packageType: string): string {
  const id = getPackageOption(packageType).id;
  switch (id) {
    case "single":
      return "Complete your session within 2 weeks of purchase.";
    case "package_4":
    case "package_6":
      return "Use remaining sessions within 2 months of purchase.";
    case "package_8":
      return "Use remaining sessions within 3 months of purchase.";
    default:
      return "Use remaining sessions within the validity period shown on your receipt.";
  }
}
