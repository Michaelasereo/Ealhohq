import { Prisma, type DiscountCode } from "@prisma/client";

import {
  calculatePackagePrice,
  getPackageExpiry,
  getPackageOption,
} from "@/lib/packages/config";
import { prisma } from "@/lib/prisma/client";
import { chargeSessionRateNgn } from "@/lib/referral/pricing";
import { watCurrentMonthYm } from "@/lib/wat-datetime";

const TX_OPTS = { timeout: 10_000 } as const;

/** Therapist + patient for confirmations; omit `package` so Prisma does not require `packageId` / package tables on older DBs. */
const bookingInclude = {
  therapist: { include: { profile: true } },
  patient: true,
} as const;

/**
 * Mark booking paid and ensure a therapy session exists (idempotent).
 * Used after verified Paystack payment and by legacy confirm endpoint.
 */
export async function finalizeTherapyPayment(
  bookingId: string,
  paystackReference: string,
  packageType = "single",
) {
  const packageOption = getPackageOption(packageType);
  const existingSession = await prisma.therapySession.findUnique({
    where: { bookingId },
  });

  if (existingSession) {
    const booking = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });
    if (!booking) {
      throw new Error("Booking not found");
    }
    return {
      booking,
      sessionId: existingSession.id,
      shouldSendConfirmationEmail: false,
    };
  }

  const booking = await prisma.therapyBooking.update({
    where: { id: bookingId },
    data: {
      status: "confirmed",
      paymentStatus: "paid",
      paystackReference,
    },
    include: bookingInclude,
  });

  const previousSessions = await prisma.therapySession.count({
    where: {
      therapistId: booking.therapistId,
      ...(booking.patientId ? { patientId: booking.patientId } : {}),
    },
  });

  const session = await prisma.therapySession.upsert({
    where: { bookingId: booking.id },
    update: {},
    create: {
      bookingId: booking.id,
      therapistId: booking.therapistId,
      patientId: booking.patientId,
      sessionNumber: previousSessions + 1,
      format: "telehealth",
      status: "scheduled",
    },
  });

  if (booking.patientId && booking.sessionType !== "psychiatric_assessment") {
    const rate = chargeSessionRateNgn(booking);
    if (packageOption.id === "single") {
      const pricing = calculatePackagePrice(rate, packageOption);
      const createdPackage = await prisma.therapySessionPackage.create({
        data: {
          patientId: booking.patientId,
          therapistId: booking.therapistId,
          packageType: packageOption.id,
          totalSessions: 1,
          usedSessions: 1,
          remainingSessions: 0,
          pricePerSession: new Prisma.Decimal(String(pricing.pricePerSession)),
          totalPaid: new Prisma.Decimal(String(pricing.finalPrice)),
          discountPercent: packageOption.discountPercent,
          paystackReference,
          status: "exhausted",
          expiresAt: getPackageExpiry("single"),
        },
      });
      await prisma.therapyBooking.update({
        where: { id: booking.id },
        data: { packageId: createdPackage.id },
      });
    } else {
      const pricing = calculatePackagePrice(rate, packageOption);
      const createdPackage = await prisma.therapySessionPackage.create({
        data: {
          patientId: booking.patientId,
          therapistId: booking.therapistId,
          packageType: packageOption.id,
          totalSessions: packageOption.sessions,
          usedSessions: 1,
          remainingSessions: Math.max(0, packageOption.sessions - 1),
          pricePerSession: new Prisma.Decimal(String(pricing.pricePerSession)),
          totalPaid: new Prisma.Decimal(String(pricing.finalPrice)),
          discountPercent: packageOption.discountPercent,
          paystackReference,
          status: "active",
          expiresAt: getPackageExpiry(packageOption.id),
        },
      });
      await prisma.therapyBooking.update({
        where: { id: booking.id },
        data: { packageId: createdPackage.id },
      });
    }
  }

  if (booking.sessionType === "psychiatric_assessment") {
    const ps = await prisma.psychiatricSession.findUnique({
      where: { bookingId },
    });
    if (ps) {
      await prisma.psychiatricInvitation.updateMany({
        where: { psychiatricSessionId: ps.id, status: "pending" },
        data: { status: "accepted" },
      });
    }
  }

  return {
    booking,
    sessionId: session.id,
    shouldSendConfirmationEmail: true,
  };
}

const creditRef = (bookingId: string) => `credit:${bookingId}`;

/**
 * Confirm a pending booking using 1 session credit (idempotent if session exists).
 */
export async function finalizeTherapyPaymentWithCredits(bookingId: string) {
  return prisma.$transaction(
    async (tx) => {
      const existingSession = await tx.therapySession.findUnique({
        where: { bookingId },
      });

      const bookingRow = await tx.therapyBooking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });
      if (!bookingRow?.patientId) {
        throw new Error("Booking not found or has no client");
      }

      if (existingSession) {
        return {
          booking: bookingRow,
          sessionId: existingSession.id,
          shouldSendConfirmationEmail: false,
        };
      }

      const credit = await tx.therapyCredit.findUnique({
        where: { patientId: bookingRow.patientId },
      });
      const balance = Number(credit?.balance ?? 0);
      if (balance < 1) {
        throw new Error("Insufficient credits");
      }

      await tx.therapyCredit.update({
        where: { patientId: bookingRow.patientId },
        data: { balance: { decrement: 1 } },
      });
      await tx.therapyCreditTransaction.create({
        data: {
          patientId: bookingRow.patientId,
          amount: -1,
          type: "session",
          reference: bookingId,
        },
      });

      const booking = await tx.therapyBooking.update({
        where: { id: bookingId },
        data: {
          status: "confirmed",
          paymentStatus: "paid",
          paidWithCredits: true,
          paystackReference: creditRef(bookingId),
        },
        include: bookingInclude,
      });

      const previousSessions = await tx.therapySession.count({
        where: {
          therapistId: booking.therapistId,
          patientId: booking.patientId,
        },
      });

      const session = await tx.therapySession.create({
        data: {
          bookingId: booking.id,
          therapistId: booking.therapistId,
          patientId: booking.patientId,
          sessionNumber: previousSessions + 1,
          format: "telehealth",
          status: "scheduled",
        },
      });

      return {
        booking,
        sessionId: session.id,
        shouldSendConfirmationEmail: true,
      };
    },
    TX_OPTS,
  );
}

/**
 * Confirm a booking by consuming one active package session.
 */
export async function finalizeTherapyPaymentWithPackageCredit(params: {
  bookingId: string;
  packageId: string;
}) {
  const { bookingId, packageId } = params;
  return prisma.$transaction(
    async (tx) => {
      const existingSession = await tx.therapySession.findUnique({
        where: { bookingId },
      });

      const bookingRow = await tx.therapyBooking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });
      if (!bookingRow?.patientId) {
        throw new Error("Booking not found or has no client");
      }

      const pkg = await tx.therapySessionPackage.findUnique({
        where: { id: packageId },
      });
      if (!pkg) throw new Error("Package not found");
      if (pkg.patientId !== bookingRow.patientId) throw new Error("Package mismatch");
      if (pkg.therapistId !== bookingRow.therapistId) throw new Error("Therapist mismatch");
      if (pkg.status !== "active") throw new Error("Package not active");
      if (pkg.expiresAt && pkg.expiresAt < new Date()) throw new Error("Package expired");
      if (pkg.remainingSessions <= 0) throw new Error("No sessions remaining");

      if (existingSession) {
        return {
          booking: bookingRow,
          sessionId: existingSession.id,
          shouldSendConfirmationEmail: false,
          packageExhausted: pkg.remainingSessions - 1 <= 0,
        };
      }

      const booking = await tx.therapyBooking.update({
        where: { id: bookingId },
        data: {
          status: "confirmed",
          paymentStatus: "package_credit",
          paidWithCredits: false,
          paystackReference: `package:${packageId}:${bookingId}`,
          packageId: pkg.id,
        },
        include: bookingInclude,
      });

      const nextRemaining = Math.max(0, pkg.remainingSessions - 1);
      await tx.therapySessionPackage.update({
        where: { id: pkg.id },
        data: {
          usedSessions: { increment: 1 },
          remainingSessions: { decrement: 1 },
          status: nextRemaining <= 0 ? "exhausted" : "active",
        },
      });

      const previousSessions = await tx.therapySession.count({
        where: {
          therapistId: booking.therapistId,
          patientId: booking.patientId,
        },
      });

      const session = await tx.therapySession.create({
        data: {
          bookingId: booking.id,
          therapistId: booking.therapistId,
          patientId: booking.patientId,
          sessionNumber: previousSessions + 1,
          format: "telehealth",
          status: "scheduled",
        },
      });

      return {
        booking,
        sessionId: session.id,
        shouldSendConfirmationEmail: true,
        packageExhausted: nextRemaining <= 0,
      };
    },
    TX_OPTS,
  );
}

/** 100% discount — confirm booking, create session, record code use (DB-only transaction). */
export async function finalizeFreeTherapyWithDiscount(opts: {
  bookingId: string;
  discount: DiscountCode;
  savedAmountNgn: number;
}) {
  const { bookingId, discount, savedAmountNgn } = opts;
  const ref = `discount:${discount.code}:${Date.now()}`;
  const dAmt = new Prisma.Decimal(String(savedAmountNgn));
  const savedDec = new Prisma.Decimal(String(savedAmountNgn));

  const exists = await prisma.therapyBooking.findUnique({
    where: { id: bookingId },
    select: { id: true },
  });
  if (!exists) {
    throw new Error("Booking not found");
  }

  return prisma.$transaction(
    async (tx) => {
      const fresh = await tx.discountCode.findUnique({
        where: { id: discount.id },
      });
      if (!fresh?.isActive) throw new Error("Discount invalid");
      if (fresh.expiresAt && fresh.expiresAt < new Date()) {
        throw new Error("Discount expired");
      }
      if (fresh.maxUses != null && fresh.usedCount >= fresh.maxUses) {
        throw new Error("Discount limit reached");
      }

      const bookingRow = await tx.therapyBooking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });
      if (!bookingRow) throw new Error("Booking not found");
      if (
        bookingRow.status !== "pending" ||
        bookingRow.paymentStatus !== "pending"
      ) {
        throw new Error("Booking is not awaiting payment");
      }

      await tx.discountCode.update({
        where: { id: fresh.id },
        data: { usedCount: { increment: 1 } },
      });

      const existingSession = await tx.therapySession.findUnique({
        where: { bookingId },
      });

      if (existingSession) {
        const updated = await tx.therapyBooking.update({
          where: { id: bookingId },
          data: {
            discountCode: fresh.code,
            discountAmount: dAmt,
            status: "confirmed",
            paymentStatus: "paid",
            paystackReference: ref,
          },
          include: bookingInclude,
        });
        await tx.discountCodeUse.create({
          data: {
            codeId: fresh.id,
            bookingId,
            savedAmount: savedDec,
          },
        });
        return {
          booking: updated,
          sessionId: existingSession.id,
          reference: ref,
          shouldSendConfirmationEmail: false,
        };
      }

      const booking = await tx.therapyBooking.update({
        where: { id: bookingId },
        data: {
          discountCode: fresh.code,
          discountAmount: dAmt,
          status: "confirmed",
          paymentStatus: "paid",
          paystackReference: ref,
        },
        include: bookingInclude,
      });

      const previousSessions = await tx.therapySession.count({
        where: {
          therapistId: booking.therapistId,
          ...(booking.patientId ? { patientId: booking.patientId } : {}),
        },
      });

      const session = await tx.therapySession.create({
        data: {
          bookingId: booking.id,
          therapistId: booking.therapistId,
          patientId: booking.patientId,
          sessionNumber: previousSessions + 1,
          format: "telehealth",
          status: "scheduled",
        },
      });

      await tx.discountCodeUse.create({
        data: {
          codeId: fresh.id,
          bookingId,
          savedAmount: savedDec,
        },
      });

      return {
        booking,
        sessionId: session.id,
        reference: ref,
        shouldSendConfirmationEmail: true,
      };
    },
    TX_OPTS,
  );
}

const partnerPoolRef = (bookingId: string, monthYm: string) =>
  `partner_pool:${monthYm}:${bookingId}`;

/**
 * Confirm a pending booking using one corporate partner monthly credit (idempotent if session exists).
 */
export async function finalizeTherapyPaymentWithPartnerMonthlyCredit(bookingId: string) {
  const monthYm = watCurrentMonthYm();

  return prisma.$transaction(
    async (tx) => {
      const existingSession = await tx.therapySession.findUnique({
        where: { bookingId },
      });

      if (existingSession) {
        const b = await tx.therapyBooking.findUnique({
          where: { id: bookingId },
          include: bookingInclude,
        });
        if (!b) throw new Error("Booking not found");
        return {
          booking: b,
          sessionId: existingSession.id,
          shouldSendConfirmationEmail: false,
        };
      }

      const bookingRow = await tx.therapyBooking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });
      if (!bookingRow?.patientId) {
        throw new Error("Booking not found or has no client");
      }

      const patient = await tx.therapyPatient.findUnique({
        where: { id: bookingRow.patientId },
        include: { partnerClient: true },
      });
      if (!patient?.partnerClientId || !patient.partnerClient) {
        throw new Error("Not enrolled in a partner programme");
      }

      const pc = patient.partnerClient;
      if (pc.onboardingStatus !== "active") {
        throw new Error("Partner account setup is not complete");
      }
      if (pc.monthlyCreditsRemaining < 1) {
        throw new Error("No covered sessions remaining this month");
      }

      const allocation = await tx.partnerCreditAllocation.findUnique({
        where: {
          superReferralPartnerId_month: {
            superReferralPartnerId: pc.superReferralPartnerId,
            month: monthYm,
          },
        },
      });
      if (!allocation) {
        throw new Error("No employer pool exists for this month");
      }
      if (!allocation.approvedByAdmin) {
        throw new Error("Employer pool is not yet approved for this month");
      }

      const decremented = await tx.$queryRawUnsafe<{ id: string }[]>(
        `UPDATE "partner_clients"
         SET "monthlyCreditsRemaining" = "monthlyCreditsRemaining" - 1,
             "updatedAt" = NOW()
         WHERE "id" = $1 AND "monthlyCreditsRemaining" >= 1
         RETURNING "id"`,
        pc.id,
      );
      if (!decremented.length) {
        throw new Error("No covered sessions remaining this month");
      }

      await tx.$queryRawUnsafe(
        `UPDATE "partner_credit_allocations"
         SET "usedCredits" = "usedCredits" + 1,
             "updatedAt" = NOW()
         WHERE "id" = $1 AND "usedCredits" < "totalPool"`,
        allocation.id,
      );

      const booking = await tx.therapyBooking.update({
        where: { id: bookingId },
        data: {
          status: "confirmed",
          paymentStatus: "paid",
          paidWithCredits: false,
          paystackReference: partnerPoolRef(bookingId, monthYm),
          partnerClientCoverageId: pc.id,
        },
        include: bookingInclude,
      });

      const previousSessions = await tx.therapySession.count({
        where: {
          therapistId: booking.therapistId,
          patientId: booking.patientId,
        },
      });

      const session = await tx.therapySession.create({
        data: {
          bookingId: booking.id,
          therapistId: booking.therapistId,
          patientId: booking.patientId,
          sessionNumber: previousSessions + 1,
          format: "telehealth",
          status: "scheduled",
        },
      });

      return {
        booking,
        sessionId: session.id,
        shouldSendConfirmationEmail: true,
      };
    },
    TX_OPTS,
  );
}

const partnerPsychPoolRef = (bookingId: string, monthYm: string) =>
  `partner_pool_psych:2:${monthYm}:${bookingId}`;

/**
 * Confirm a psychiatric booking using two corporate partner monthly credits.
 */
export async function finalizePsychiatricPaymentWithPartnerMonthlyCredit(
  bookingId: string,
) {
  const monthYm = watCurrentMonthYm();

  return prisma.$transaction(
    async (tx) => {
      const existingSession = await tx.therapySession.findUnique({
        where: { bookingId },
      });

      if (existingSession) {
        const b = await tx.therapyBooking.findUnique({
          where: { id: bookingId },
          include: bookingInclude,
        });
        if (!b) throw new Error("Booking not found");
        return {
          booking: b,
          sessionId: existingSession.id,
          shouldSendConfirmationEmail: false,
        };
      }

      const bookingRow = await tx.therapyBooking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });
      if (!bookingRow?.patientId) {
        throw new Error("Booking not found or has no client");
      }
      if (bookingRow.sessionType !== "psychiatric_assessment") {
        throw new Error("Not a psychiatric booking");
      }

      const patient = await tx.therapyPatient.findUnique({
        where: { id: bookingRow.patientId },
        include: { partnerClient: true },
      });
      if (!patient?.partnerClientId || !patient.partnerClient) {
        throw new Error("Not enrolled in a partner programme");
      }

      const pc = patient.partnerClient;
      if (pc.onboardingStatus !== "active") {
        throw new Error("Partner account setup is not complete");
      }
      if (pc.monthlyCreditsRemaining < 2) {
        throw new Error("No covered sessions remaining this month");
      }

      const allocation = await tx.partnerCreditAllocation.findUnique({
        where: {
          superReferralPartnerId_month: {
            superReferralPartnerId: pc.superReferralPartnerId,
            month: monthYm,
          },
        },
      });
      if (!allocation) {
        throw new Error("No employer pool exists for this month");
      }
      if (!allocation.approvedByAdmin) {
        throw new Error("Employer pool is not yet approved for this month");
      }

      const decremented = await tx.$queryRawUnsafe<{ id: string }[]>(
        `UPDATE "partner_clients"
         SET "monthlyCreditsRemaining" = "monthlyCreditsRemaining" - 2,
             "updatedAt" = NOW()
         WHERE "id" = $1 AND "monthlyCreditsRemaining" >= 2
         RETURNING "id"`,
        pc.id,
      );
      if (!decremented.length) {
        throw new Error("No covered sessions remaining this month");
      }

      await tx.$queryRawUnsafe(
        `UPDATE "partner_credit_allocations"
         SET "usedCredits" = "usedCredits" + 2,
             "updatedAt" = NOW()
         WHERE "id" = $1 AND "usedCredits" + 2 <= "totalPool"`,
        allocation.id,
      );

      const booking = await tx.therapyBooking.update({
        where: { id: bookingId },
        data: {
          status: "confirmed",
          paymentStatus: "paid",
          paidWithCredits: false,
          paystackReference: partnerPsychPoolRef(bookingId, monthYm),
          partnerClientCoverageId: pc.id,
        },
        include: bookingInclude,
      });

      const previousSessions = await tx.therapySession.count({
        where: {
          therapistId: booking.therapistId,
          patientId: booking.patientId,
        },
      });

      const session = await tx.therapySession.create({
        data: {
          bookingId: booking.id,
          therapistId: booking.therapistId,
          patientId: booking.patientId,
          sessionNumber: previousSessions + 1,
          format: "telehealth",
          status: "scheduled",
        },
      });

      const ps = await tx.psychiatricSession.findUnique({
        where: { bookingId },
      });
      if (ps) {
        await tx.psychiatricInvitation.updateMany({
          where: { psychiatricSessionId: ps.id, status: "pending" },
          data: { status: "accepted" },
        });
      }

      return {
        booking,
        sessionId: session.id,
        shouldSendConfirmationEmail: true,
      };
    },
    TX_OPTS,
  );
}

/**
 * Confirm a psychiatric booking using two wallet credits (balance units).
 */
export async function finalizePsychiatricPaymentWithWalletCredits(
  bookingId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const existingSession = await tx.therapySession.findUnique({
        where: { bookingId },
      });

      const bookingRow = await tx.therapyBooking.findUnique({
        where: { id: bookingId },
        include: bookingInclude,
      });
      if (!bookingRow?.patientId) {
        throw new Error("Booking not found or has no client");
      }
      if (bookingRow.sessionType !== "psychiatric_assessment") {
        throw new Error("Not a psychiatric booking");
      }

      if (existingSession) {
        return {
          booking: bookingRow,
          sessionId: existingSession.id,
          shouldSendConfirmationEmail: false,
        };
      }

      const credit = await tx.therapyCredit.findUnique({
        where: { patientId: bookingRow.patientId },
      });
      const balance = Number(credit?.balance ?? 0);
      if (balance < 2) {
        throw new Error("Insufficient credits");
      }

      await tx.therapyCredit.update({
        where: { patientId: bookingRow.patientId },
        data: { balance: { decrement: 2 } },
      });
      await tx.therapyCreditTransaction.create({
        data: {
          patientId: bookingRow.patientId,
          amount: -2,
          type: "session",
          reference: creditRef(bookingId),
        },
      });

      const booking = await tx.therapyBooking.update({
        where: { id: bookingId },
        data: {
          status: "confirmed",
          paymentStatus: "paid",
          paidWithCredits: true,
          paystackReference: creditRef(bookingId),
        },
        include: bookingInclude,
      });

      const previousSessions = await tx.therapySession.count({
        where: {
          therapistId: booking.therapistId,
          patientId: booking.patientId,
        },
      });

      const session = await tx.therapySession.create({
        data: {
          bookingId: booking.id,
          therapistId: booking.therapistId,
          patientId: booking.patientId,
          sessionNumber: previousSessions + 1,
          format: "telehealth",
          status: "scheduled",
        },
      });

      const ps = await tx.psychiatricSession.findUnique({
        where: { bookingId },
      });
      if (ps) {
        await tx.psychiatricInvitation.updateMany({
          where: { psychiatricSessionId: ps.id, status: "pending" },
          data: { status: "accepted" },
        });
      }

      return {
        booking,
        sessionId: session.id,
        shouldSendConfirmationEmail: true,
      };
    },
    TX_OPTS,
  );
}
