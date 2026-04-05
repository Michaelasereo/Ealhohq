import { prisma } from "@/lib/prisma/client";

import { tierFromBalance } from "@/lib/credits/purchase-config";

/**
 * Idempotent: skip if this Paystack reference was already recorded.
 */
export async function finalizeCreditPurchase(params: {
  patientId: string;
  credits: number;
  paystackReference: string;
  packageKey: string;
}) {
  const { patientId, credits, paystackReference, packageKey } = params;

  const dup = await prisma.therapyCreditTransaction.findFirst({
    where: { reference: paystackReference },
  });
  if (dup) {
    return { alreadyApplied: true as const };
  }

  await prisma.$transaction(async (tx) => {
    const row = await tx.therapyCredit.upsert({
      where: { patientId },
      create: {
        patientId,
        balance: credits,
        tier: tierFromBalance(credits),
      },
      update: {
        balance: { increment: credits },
      },
    });

    await tx.therapyCredit.update({
      where: { patientId },
      data: {
        tier: tierFromBalance(row.balance),
      },
    });

    await tx.therapyCreditTransaction.create({
      data: {
        patientId,
        amount: credits,
        type: "purchase",
        reference: paystackReference,
      },
    });
  });

  void packageKey;
  return { alreadyApplied: false as const };
}
