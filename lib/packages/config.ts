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

export function getPackageExpiry(): Date {
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + 6);
  return expiry;
}
