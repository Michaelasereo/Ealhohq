import { Prisma } from "@prisma/client";

export function formatNaira(amount: number | Prisma.Decimal | string): string {
  const n = typeof amount === "string" ? Number(amount) : Number(amount);
  if (Number.isNaN(n)) return "₦0";
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}
