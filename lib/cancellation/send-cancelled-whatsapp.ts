import {
  formatBookingDateLong,
  formatSlotTo12h,
} from "@/lib/booking/display-wat";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { prisma } from "@/lib/prisma/client";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { templates } from "@/lib/whatsapp/templates";

/** Best-effort client WhatsApp after a booking is marked cancelled in DB. */
export function sendSessionCancelledWhatsApp(bookingId: string): void {
  void prisma.therapyBooking
    .findUnique({
      where: { id: bookingId },
      include: {
        therapist: { include: { profile: true } },
        patient: true,
      },
    })
    .then((booking) => {
      if (!booking) return;
      const phone = booking.guestPhone ?? booking.patient?.phone;
      if (!phone?.trim()) return;
      return sendWhatsApp({
        to: phone.trim(),
        body: templates.sessionCancelled({
          patientName:
            booking.guestName ?? booking.patient?.fullName ?? "there",
          therapistName: therapistPublicLabel(
            booking.therapist.profile.fullName,
          ),
          date: formatBookingDateLong(booking.date),
          time: formatSlotTo12h(booking.startTime),
          isAnonymous: booking.isAnonymous,
        }),
      });
    })
    .catch((err) => console.error("WhatsApp cancel:", err));
}
