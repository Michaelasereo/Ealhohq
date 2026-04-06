import type { Prisma } from "@prisma/client";

import { bookingConfirmation, generateGoogleCalendarLink } from "@/lib/email/templates/booking-confirmation";
import { buildBookingEmailLayoutParams } from "@/lib/emails/build-booking-email-params";
import { getBookingRecipientEmail } from "@/lib/emails/booking-recipient";
import { sendBookingConfirmationWhatsAppIfPhone } from "@/lib/reminders/send-booking-confirmation-wa";
import { sessionJoinUrl } from "@/lib/reminders/format-session-link";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { getDisplayName } from "@/lib/utils/patient-display";
import { bookingDateStartToIso } from "@/lib/wat-datetime";

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
    const startIso = bookingDateStartToIso(booking.date, booking.startTime);
    const endIso = new Date(
      new Date(startIso).getTime() + booking.therapist.sessionDuration * 60_000,
    ).toISOString();

    const join = sessionJoinUrl(booking.id);
    const calendarUrl = generateGoogleCalendarLink({
      title: `Therapy — ${layout.therapistName}`,
      startDateTime: startIso,
      endDateTime: endIso,
      description: `Ealho Therapy session with ${layout.therapistName}. Join: ${join}`,
      location: join,
    });

    const timeOnly = new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Africa/Lagos",
    }).format(new Date(startIso));

    const tpl = bookingConfirmation({
      clientName: getDisplayName(booking),
      therapistName: layout.therapistName,
      date: layout.dateTimeLine,
      time: timeOnly,
      duration: booking.therapist.sessionDuration,
      sessionLink: join,
      calendarUrl,
      isAnonymous: booking.isAnonymous,
      isReferral: booking.isReferral,
    });

    const sent = await sendTransactionalEmail({
      to,
      subject: tpl.subject,
      html: tpl.html,
    });
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
