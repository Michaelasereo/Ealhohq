import { prisma } from "@/lib/prisma/client";
import { bookingEndTime, ymdFromSuggestedDate } from "@/lib/rebooking/validate-request";
import { watDayStart } from "@/lib/wat-datetime";

/**
 * Ensures a pending `TherapyBooking` exists for this rebooking request
 * and is linked on the request row.
 */
export async function ensurePendingBookingForRebookRequest(
  requestId: string,
  consentTimestamp?: Date,
): Promise<{ bookingId: string; patientEmail: string }> {
  const now = new Date();
  const r = await prisma.therapyRebookingRequest.findUnique({
    where: { id: requestId },
    include: { therapist: true, patient: true },
  });

  if (!r || r.status !== "pending" || r.expiresAt < now) {
    throw new Error("INVALID_REQUEST");
  }

  if (r.bookingId) {
    const existing = await prisma.therapyBooking.findUnique({
      where: { id: r.bookingId },
    });
    if (existing?.status === "confirmed") {
      throw new Error("ALREADY_CONFIRMED");
    }
    if (existing?.status === "pending") {
      return { bookingId: r.bookingId, patientEmail: r.patient.email };
    }
  }

  const ymd = ymdFromSuggestedDate(r.suggestedDate);
  const endTime = bookingEndTime(
    r.suggestedTime,
    r.therapist.sessionDuration,
  );

  const booking = await prisma.therapyBooking.create({
    data: {
      therapistId: r.therapistId,
      patientId: r.patientId,
      date: watDayStart(ymd),
      startTime: r.suggestedTime,
      endTime,
      sessionType: r.sessionType,
      status: "pending",
      paymentStatus: "pending",
      consentConfirmed: true,
      consentTimestamp: consentTimestamp ?? new Date(),
    },
  });

  await prisma.therapyRebookingRequest.update({
    where: { id: requestId },
    data: { bookingId: booking.id },
  });

  return { bookingId: booking.id, patientEmail: r.patient.email };
}
