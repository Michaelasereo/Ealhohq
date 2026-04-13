import type { Prisma } from "@prisma/client";

import { getAuthUserEmailById } from "@/lib/auth/auth-user-email";
import { prisma } from "@/lib/prisma/client";
import {
  formatBookingDateLong,
  formatSlotTo12h,
} from "@/lib/booking/display-wat";
import { bookingConfirmation, generateGoogleCalendarLink } from "@/lib/email/templates/booking-confirmation";
import { therapistNewBookingEmail } from "@/lib/email/templates/therapist-new-booking";
import { buildBookingEmailLayoutParams } from "@/lib/emails/build-booking-email-params";
import { getAppOrigin } from "@/lib/emails/utils";
import { getBookingRecipientEmail } from "@/lib/emails/booking-recipient";
import { sendBookingConfirmationWhatsAppIfPhone } from "@/lib/reminders/send-booking-confirmation-wa";
import { sessionJoinUrl } from "@/lib/reminders/format-session-link";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { therapistFirstNameForGreeting } from "@/lib/therapist-display-name";
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
  if (booking.sessionType === "psychiatric_assessment") {
    const to = getBookingRecipientEmail(booking);
    if (to) {
      const psych = await prisma.psychiatricSession.findUnique({
        where: { bookingId: booking.id },
        include: { psychiatrist: true },
      });
      const startIso = bookingDateStartToIso(booking.date, booking.startTime);
      const join = sessionJoinUrl(booking.id);
      const psychName = psych?.psychiatrist.name ?? "your psychiatrist";
      void sendTransactionalEmail({
        to,
        subject: "Psychiatric assessment confirmed",
        html: `<p>Your psychiatric assessment with <strong>${psychName}</strong> is confirmed.</p>
        <p><a href="${join}">Join link</a></p>`,
      }).catch(() => {});
    }
    return;
  }

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

  try {
    const therapistEmail = await getAuthUserEmailById(
      booking.therapist.profileId,
    );
    if (therapistEmail) {
      const date = formatBookingDateLong(booking.date);
      const time = formatSlotTo12h(booking.startTime);
      const patientDisplay = booking.isAnonymous
        ? (booking.clientAlias ?? "Anonymous client")
        : (booking.guestName ?? booking.patient?.fullName ?? "Client");
      const origin = getAppOrigin().replace(/\/$/, "");
      const tpl = therapistNewBookingEmail({
        therapistFirstName: therapistFirstNameForGreeting(
          booking.therapist.profile.fullName,
        ),
        patientDisplay,
        date,
        time,
        sessionTypeLabel:
          booking.sessionType === "intake"
            ? "Intake Assessment"
            : "Follow-up Session",
        isAnonymous: booking.isAnonymous,
        bookingReason: booking.guestBookingReason,
        professionalType: booking.professionalType,
        dashboardUrl: `${origin}/therapist/dashboard`,
      });
      const sent = await sendTransactionalEmail({
        to: therapistEmail,
        subject: tpl.subject,
        html: tpl.html,
      });
      if (!sent.success) {
        console.error("Therapist new-booking email:", sent.error);
      }
    }
  } catch (therapistMailErr) {
    console.error("Therapist new-booking email failed:", therapistMailErr);
  }
}
