import type { Prisma } from "@prisma/client";

import { buildBookingEmailLayoutParams } from "@/lib/emails/build-booking-email-params";
import { getBookingRecipientEmail } from "@/lib/emails/booking-recipient";
import { sendBookingConfirmationWhatsAppIfPhone } from "@/lib/reminders/send-booking-confirmation-wa";
import { sendBookingConfirmationEmail } from "@/lib/reminders/send-email";

/** Matches `finalizeTherapyPayment` include — required for email + WhatsApp templates. */
export type TherapyBookingWithNotifyInclude = Prisma.TherapyBookingGetPayload<{
  include: {
    therapist: { include: { profile: true } };
    patient: true;
  };
}>;

/**
 * Sends booking confirmation email (with signup CTA) and WhatsApp when applicable.
 * Call only when `finalizeTherapyPayment` / credits finalize returns `shouldSendConfirmationEmail: true`.
 */
export async function sendTherapyBookingPaidNotifications(
  booking: TherapyBookingWithNotifyInclude,
): Promise<void> {
  const to = getBookingRecipientEmail(booking);
  if (to) {
    const layout = buildBookingEmailLayoutParams(booking);
    const sent = await sendBookingConfirmationEmail(to, layout);
    if (!sent.success) {
      console.error("Booking confirmation email:", sent.error);
    }
  }
  try {
    await sendBookingConfirmationWhatsAppIfPhone(booking);
  } catch (waErr) {
    console.error("Booking confirmation WhatsApp:", waErr);
  }
}
