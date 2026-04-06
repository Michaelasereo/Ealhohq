import { Prisma } from "@prisma/client";

/**
 * Moves all data from `secondaryId` onto `primaryId`, then deletes the secondary
 * patient row. Used when the same person has multiple guest `therapy_patients`
 * rows (same email) before linking to an auth profile.
 */
export async function mergePatientRecordsIntoPrimary(
  tx: Prisma.TransactionClient,
  primaryId: string,
  secondaryId: string,
) {
  if (primaryId === secondaryId) return;

  await tx.therapyBooking.updateMany({
    where: { patientId: secondaryId },
    data: { patientId: primaryId },
  });

  await tx.therapySession.updateMany({
    where: { patientId: secondaryId },
    data: { patientId: primaryId },
  });

  await tx.therapySessionPackage.updateMany({
    where: { patientId: secondaryId },
    data: { patientId: primaryId },
  });

  await tx.therapyCreditTransaction.updateMany({
    where: { patientId: secondaryId },
    data: { patientId: primaryId },
  });

  await tx.therapyRebookingRequest.updateMany({
    where: { patientId: secondaryId },
    data: { patientId: primaryId },
  });

  await tx.chatConsent.updateMany({
    where: { patientId: secondaryId },
    data: { patientId: primaryId },
  });

  const [primaryCred, secCred] = await Promise.all([
    tx.therapyCredit.findUnique({ where: { patientId: primaryId } }),
    tx.therapyCredit.findUnique({ where: { patientId: secondaryId } }),
  ]);

  if (secCred) {
    const add = new Prisma.Decimal(secCred.balance);
    if (primaryCred) {
      await tx.therapyCredit.update({
        where: { patientId: primaryId },
        data: { balance: { increment: add } },
      });
    } else {
      await tx.therapyCredit.create({
        data: {
          patientId: primaryId,
          balance: add,
          tier: secCred.tier,
        },
      });
    }
    await tx.therapyCredit.delete({ where: { patientId: secondaryId } });
  }

  const [primaryMh, secMh] = await Promise.all([
    tx.therapyMedicalHistory.findUnique({ where: { patientId: primaryId } }),
    tx.therapyMedicalHistory.findUnique({ where: { patientId: secondaryId } }),
  ]);
  if (secMh && !primaryMh) {
    await tx.therapyMedicalHistory.update({
      where: { patientId: secondaryId },
      data: { patientId: primaryId },
    });
  } else if (secMh && primaryMh) {
    await tx.therapyMedicalHistory.delete({ where: { patientId: secondaryId } });
  }

  const secThreads = await tx.chatThread.findMany({
    where: { patientId: secondaryId },
  });

  for (const th of secThreads) {
    const conflict = await tx.chatThread.findFirst({
      where: {
        patientId: primaryId,
        therapistId: th.therapistId,
      },
    });

    if (!conflict) {
      await tx.chatThread.update({
        where: { id: th.id },
        data: { patientId: primaryId },
      });
    } else {
      await tx.chatMessage.updateMany({
        where: { threadId: th.id },
        data: { threadId: conflict.id },
      });
      await tx.chatAuditLog.updateMany({
        where: { threadId: th.id },
        data: { threadId: conflict.id },
      });
      await tx.chatThread.delete({ where: { id: th.id } });
    }
  }

  await tx.therapyPatient.delete({ where: { id: secondaryId } });
}
