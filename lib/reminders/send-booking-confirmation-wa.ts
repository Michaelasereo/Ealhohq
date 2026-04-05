import type { Prisma } from "@prisma/client";

import {
  formatBookingDateLong,
  formatSlotTo12h,
} from "@/lib/booking/display-wat";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { templates } from "@/lib/whatsapp/templates";
import { sessionJoinUrl } from "@/lib/reminders/format-session-link";

type BookingWa = Prisma.TherapyBookingGetPayload<{
  include: {
    therapist: { include: { profile: true } };
    patient: true;
  };
}>;

/**
 * Sends paid-booking WhatsApp to patient and therapist when phone numbers exist.
 * Fire-and-forget; errors are logged only.
 */
export async function sendBookingConfirmationWhatsAppIfPhone(
  booking: BookingWa,
): Promise<void> {
  const sessionLink = sessionJoinUrl(booking.id);
  const date = formatBookingDateLong(booking.date);
  const time = formatSlotTo12h(booking.startTime);
  const therapistName = booking.therapist.profile.fullName;
  const duration = booking.therapist.sessionDuration;

  const patientPhone = booking.guestPhone ?? booking.patient?.phone;
  if (patientPhone?.trim()) {
    void sendWhatsApp({
      to: patientPhone,
      body: templates.bookingConfirmed({
        patientName:
          booking.guestName ?? booking.patient?.fullName ?? "there",
        therapistName,
        date,
        time,
        duration,
        sessionLink,
        isAnonymous: booking.isAnonymous,
      }),
    }).catch((err) => console.error("WhatsApp send failed:", err));
  }

  const therapistPhone = booking.therapist.profile.phone;
  if (therapistPhone?.trim()) {
    const patientDisplay = booking.isAnonymous
      ? (booking.clientAlias ?? "Anonymous Client")
      : (booking.guestName ?? booking.patient?.fullName ?? "Patient");

    void sendWhatsApp({
      to: therapistPhone,
      body: templates.therapistSessionBooked({
        therapistName,
        patientDisplay,
        date,
        time,
        sessionType: booking.sessionType,
        isAnonymous: booking.isAnonymous,
      }),
    }).catch((err) => console.error("WhatsApp therapist notify failed:", err));
  }
}
