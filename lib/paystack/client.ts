export const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

export function formatAmountToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatAmountToNaira(kobo: number): number {
  return kobo / 100;
}

export function generateReference(): string {
  return `ealho_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
