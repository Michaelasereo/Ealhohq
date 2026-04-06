import type { Prisma } from "@prisma/client";

import { buildBookingEmailLayoutParams } from "@/lib/emails/build-booking-email-params";
import { getBookingRecipientEmail } from "@/lib/emails/booking-recipient";
import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { prisma } from "@/lib/prisma/client";
import { sessionJoinUrl } from "@/lib/reminders/format-session-link";
import { sendBookingConfirmationEmail } from "@/lib/reminders/send-email";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";

type BookingWith = Prisma.TherapyBookingGetPayload<{
  include: {
    therapist: { include: { profile: true } };
    patient: true;
  };
}>;

export async function notifyRebookBookingConfirmed(
  booking: BookingWith,
  options: { sendEmail: boolean },
) {
  const join = sessionJoinUrl(booking.id);
  const startIso = bookingDateStartToIso(booking.date, booking.startTime);
  const timeWat = formatWAT(startIso);
  const pFirst = firstName(booking.patient?.fullName ?? "there");
  const tName = therapistPublicLabel(booking.therapist.profile.fullName);

  const patientPhone = normalizeNgDigits(booking.patient?.phone ?? null);
  if (patientPhone) {
    await sendWhatsAppText({
      toE164Digits: patientPhone,
      body: `Hi ${pFirst}! Your session is confirmed.

📅 ${timeWat} WAT
${tName}

Join here: ${join}`,
    });
  }

  const therapistPhone = normalizeNgDigits(
    booking.therapist.profile.phone ?? null,
  );
  if (therapistPhone) {
    await sendWhatsAppText({
      toE164Digits: therapistPhone,
      body: `✅ ${booking.patient?.fullName ?? "Your client"} has confirmed their session
📅 ${timeWat} WAT`,
    });
  }

  if (options.sendEmail) {
    const to = getBookingRecipientEmail(booking);
    if (to) {
      const layout = buildBookingEmailLayoutParams(booking);
      const sent = await sendBookingConfirmationEmail(to, layout);
      if (!sent.success) {
        console.error("rebook confirmation email:", sent.error);
      }
    }
  }
}

export async function loadBookingForNotify(bookingId: string) {
  return prisma.therapyBooking.findUnique({
    where: { id: bookingId },
    include: {
      therapist: { include: { profile: true } },
      patient: true,
    },
  });
}
