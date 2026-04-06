export type DiscountComputation = {
  discountAmount: number;
  finalAmount: number;
  isFree: boolean;
};

export function computeDiscountForSession(
  sessionAmountNgn: number,
  discount: { discountType: string; discountValue: unknown },
): DiscountComputation {
  const amount = Math.max(0, sessionAmountNgn);
  let discountAmount = 0;
  if (discount.discountType === "full") {
    discountAmount = amount;
  } else if (discount.discountType === "percentage") {
    const pct = Number(discount.discountValue);
    discountAmount = (amount * pct) / 100;
  } else if (discount.discountType === "fixed") {
    discountAmount = Math.min(Number(discount.discountValue), amount);
  }
  discountAmount = Math.round(discountAmount * 100) / 100;
  const finalAmount = Math.max(0, Math.round((amount - discountAmount) * 100) / 100);
  return {
    discountAmount,
    finalAmount,
    isFree: finalAmount === 0,
  };
}
