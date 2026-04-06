import type { BookingConfirmationParams } from "@/lib/emails/booking-confirmation";
import { durationMinutesFromSlot, formatDurationLabel } from "@/lib/emails/utils";
import { signupUrlWithEmail } from "@/lib/reminders/booking-confirmation-copy";
import { getBookingRecipientEmail } from "@/lib/emails/booking-recipient";
import { sessionJoinUrl } from "@/lib/reminders/format-session-link";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";

export function buildBookingEmailLayoutParams(booking: {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  therapist: { profile: { fullName: string } };
  guestEmail?: string | null;
  patient?: { email: string } | null;
}): BookingConfirmationParams {
  const iso = bookingDateStartToIso(booking.date, booking.startTime);
  const startMs = new Date(iso);
  const dateLine = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "full",
    timeZone: "Africa/Lagos",
  }).format(startMs);
  const timeWat = formatWAT(iso);
  const mins = durationMinutesFromSlot(booking.startTime, booking.endTime);
  const to = getBookingRecipientEmail(booking);
  return {
    therapistName: therapistPublicLabel(booking.therapist.profile.fullName),
    dateTimeLine: dateLine,
    timeWat,
    durationLabel: formatDurationLabel(mins),
    joinUrl: sessionJoinUrl(booking.id),
    signupUrl: signupUrlWithEmail(to),
  };
}
