import { Prisma } from "@prisma/client";

import {
  getClientCancellationPolicy,
  getPlatformCancellationPolicy,
  getTherapistCancellationPolicy,
  type CancellationPolicyResult,
} from "@/lib/cancellation/policy";
import { prisma } from "@/lib/prisma/client";

export type CancelledByRole = "client" | "therapist" | "admin" | "platform";

export type CancelOutcome =
  | {
      ok: true;
      policy: CancellationPolicyResult;
      totalCreditDelta: number;
    }
  | { ok: false; error: string; status: number };

async function applyCreditDelta(
  tx: Prisma.TransactionClient,
  patientId: string,
  delta: number,
  reference: string,
  type: "refund" | "adjustment" = "refund",
) {
  if (delta === 0) return;
  const d = new Prisma.Decimal(String(delta));
  const credit = await tx.therapyCredit.findUnique({
    where: { patientId },
  });
  if (credit) {
    await tx.therapyCredit.update({
      where: { patientId },
      data: { balance: { increment: d } },
    });
  } else if (delta > 0) {
    await tx.therapyCredit.create({
      data: { patientId, balance: d },
    });
  }
  await tx.therapyCreditTransaction.create({
    data: {
      patientId,
      amount: d,
      type,
      reference,
    },
  });
}

export async function performSessionCancellation(params: {
  bookingId: string;
  cancelledBy: CancelledByRole;
  reason?: string | null;
  patientProfileId?: string;
  therapistProfileId?: string;
  isAdmin?: boolean;
}): Promise<CancelOutcome> {
  const {
    bookingId,
    cancelledBy,
    reason,
    patientProfileId,
    therapistProfileId,
    isAdmin,
  } = params;

  const booking = await prisma.therapyBooking.findUnique({
    where: { id: bookingId },
    include: {
      therapist: { include: { profile: true } },
      patient: true,
      session: true,
    },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found", status: 404 };
  }

  if (booking.status === "cancelled") {
    return { ok: false, error: "Already cancelled", status: 400 };
  }

  if (booking.status === "completed") {
    return { ok: false, error: "Cannot cancel a completed session", status: 400 };
  }

  if (
    (cancelledBy === "client" || cancelledBy === "therapist") &&
    booking.status !== "confirmed" &&
    booking.status !== "pending"
  ) {
    return { ok: false, error: "This booking cannot be cancelled", status: 400 };
  }

  if (cancelledBy === "client") {
    if (!patientProfileId || !booking.patientId) {
      return { ok: false, error: "Not authorised", status: 403 };
    }
    const patient = await prisma.therapyPatient.findFirst({
      where: { profileId: patientProfileId },
    });
    if (!patient || patient.id !== booking.patientId) {
      return { ok: false, error: "Not authorised", status: 403 };
    }
  } else if (cancelledBy === "therapist") {
    if (!therapistProfileId) {
      return { ok: false, error: "Not authorised", status: 403 };
    }
    const therapist = await prisma.therapyTherapist.findFirst({
      where: { profileId: therapistProfileId },
    });
    if (!therapist || therapist.id !== booking.therapistId) {
      return { ok: false, error: "Not authorised", status: 403 };
    }
  } else if (cancelledBy === "admin" || cancelledBy === "platform") {
    if (!isAdmin) {
      return { ok: false, error: "Not authorised", status: 403 };
    }
  }

  const pendingUnpaid =
    booking.status === "pending" && booking.paymentStatus === "pending";

  let policy: CancellationPolicyResult;
  if (pendingUnpaid) {
    policy = {
      refundType: "none",
      refundCredits: 0,
      bonusCredits: 0,
      message: "Booking cancelled before payment.",
    };
  } else if (cancelledBy === "therapist") {
    policy = getTherapistCancellationPolicy(booking.paidWithCredits);
  } else if (cancelledBy === "platform") {
    policy = getPlatformCancellationPolicy(booking.paidWithCredits);
  } else if (cancelledBy === "admin") {
    policy = getPlatformCancellationPolicy(booking.paidWithCredits);
  } else {
    const { hoursUntilSessionStart } = await import(
      "@/lib/cancellation/hours-until"
    );
    const hu = hoursUntilSessionStart(booking.date, booking.startTime);
    if (hu <= 0) {
      return {
        ok: false,
        error: "This session has already started or passed.",
        status: 400,
      };
    }
    policy = getClientCancellationPolicy(
      booking.date,
      booking.startTime,
      booking.paidWithCredits,
    );
  }

  const totalCreditDelta =
    policy.refundCredits + policy.bonusCredits;

  await prisma.$transaction(async (tx) => {
    await tx.therapyBooking.update({
      where: { id: bookingId },
      data: {
        status: "cancelled",
        cancellationReason: reason?.trim() || null,
        cancelledBy,
        cancelledAt: new Date(),
        paymentStatus:
          policy.refundType === "full" && !booking.paidWithCredits
            ? "refunded"
            : booking.paymentStatus,
      },
    });

    await tx.therapySession.updateMany({
      where: { bookingId },
      data: { status: "cancelled" },
    });

    if (booking.patientId && totalCreditDelta !== 0 && !pendingUnpaid) {
      await applyCreditDelta(
        tx,
        booking.patientId,
        totalCreditDelta,
        bookingId,
        "refund",
      );
    }
  });

  return {
    ok: true,
    policy,
    totalCreditDelta,
  };
}
