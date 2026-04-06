import type {
  SharedProfile,
  TherapyBooking,
  TherapyFeedback,
  TherapySession,
  TherapyTherapist,
} from "@prisma/client";

import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { bookingDateStartToIso } from "@/lib/wat-datetime";

export type PatientSessionView = {
  id: string;
  bookingId: string;
  therapist: { id: string; name: string; photo: string };
  dateIso: string;
  durationMins: number;
  type: "intake" | "follow-up";
  status: "upcoming" | "completed" | "cancelled";
  feedbackSubmitted: boolean;
  paidWithCredit?: boolean;
};

export function mapSessionForPatient(
  s: TherapySession & {
    booking: TherapyBooking;
    therapist: TherapyTherapist & { profile: SharedProfile };
    feedbacks: Pick<TherapyFeedback, "id">[];
  },
): PatientSessionView {
  const startIso = bookingDateStartToIso(s.booking.date, s.booking.startTime);
  const startMs = new Date(startIso).getTime();
  const now = Date.now();

  let status: PatientSessionView["status"] = "completed";
  if (s.booking.status === "cancelled" || s.status === "cancelled") {
    status = "cancelled";
  } else if (
    startMs > now &&
    s.booking.status === "confirmed" &&
    (s.status === "scheduled" || s.status === "in-progress")
  ) {
    status = "upcoming";
  }

  return {
    id: s.id,
    bookingId: s.bookingId,
    therapist: {
      id: s.therapist.id,
      name: therapistPublicLabel(s.therapist.profile.fullName),
      photo: s.therapist.profilePhoto ?? "/Ealho-logo.png",
    },
    dateIso: startIso,
    durationMins: s.durationMinutes ?? s.therapist.sessionDuration,
    type: s.booking.sessionType === "intake" ? "intake" : "follow-up",
    status,
    feedbackSubmitted: s.feedbacks.length > 0,
    paidWithCredit: s.booking.paidWithCredits,
  };
}
