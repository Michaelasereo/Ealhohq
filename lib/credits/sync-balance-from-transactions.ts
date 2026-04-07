import { tierFromBalance } from "@/lib/credits/purchase-config";
import { prisma } from "@/lib/prisma/client";

/**
 * Keeps `therapy_credits.balance` aligned with the sum of
 * `therapy_credit_transactions.amount` for this patient (e.g. after manual merges
 * or if balance drifted). Idempotent when already in sync.
 */
export async function syncTherapyCreditBalanceFromTransactions(
  patientId: string,
): Promise<void> {
  const agg = await prisma.therapyCreditTransaction.aggregate({
    where: { patientId },
    _sum: { amount: true },
  });
  const sumN = Number(agg._sum.amount ?? 0);

  const existing = await prisma.therapyCredit.findUnique({
    where: { patientId },
  });

  if (existing) {
    if (Number(existing.balance) === sumN) return;
    await prisma.therapyCredit.update({
      where: { patientId },
      data: {
        balance: sumN,
        tier: tierFromBalance(sumN),
      },
    });
    return;
  }

  if (sumN === 0) return;

  await prisma.therapyCredit.create({
    data: {
      patientId,
      balance: sumN,
      tier: tierFromBalance(sumN),
    },
  });
}
