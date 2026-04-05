import { prisma } from "@/lib/prisma/client";

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
) {
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
  return prisma.$transaction(async (tx) => {
    const existingSession = await tx.therapySession.findUnique({
      where: { bookingId },
    });

    const bookingRow = await tx.therapyBooking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });
    if (!bookingRow?.patientId) {
      throw new Error("Booking not found or has no patient");
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
    const balance = credit?.balance ?? 0;
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
  });
}
