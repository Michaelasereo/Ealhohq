import type { TherapyBooking, TherapySession, TherapyTherapist } from "@prisma/client";
import type { SharedProfile } from "@prisma/client";

import { therapistPublicLabel } from "@/lib/therapist-display-name";

export type SessionJoinPayload = {
  bookingId: string;
  sessionId: string;
  therapistName: string;
  therapistPhoto: string | null;
  date: string;
  startTime: string;
  endTime: string;
  bookingStatus: string;
  sessionStatus: string;
  agoraRoomId: string | null;
  /** Guest (no linked auth profile) must send matching guestEmail to POST /api/session/complete. */
  needsGuestEmailForComplete: boolean;
};

/** For join page (countdown + details) — confirmed booking with an active session slot. */
export function toJoinPayload(
  booking: TherapyBooking & {
    therapist: TherapyTherapist & { profile: SharedProfile };
    patient: { profileId: string | null } | null;
    session: TherapySession | null;
    psychiatricSession?: { psychiatrist: { name: string } } | null;
  },
): SessionJoinPayload | null {
  if (!booking.session) return null;
  if (booking.status !== "confirmed") return null;
  if (
    booking.session.status !== "scheduled" &&
    booking.session.status !== "in-progress"
  ) {
    return null;
  }

  const psychName = booking.psychiatricSession?.psychiatrist?.name;
  const therapistName = psychName
    ? `Dr ${psychName}`
    : therapistPublicLabel(booking.therapist.profile.fullName);

  return {
    bookingId: booking.id,
    sessionId: booking.session.id,
    therapistName,
    therapistPhoto: booking.therapist.profilePhoto,
    date: booking.date.toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    bookingStatus: booking.status,
    sessionStatus: booking.session.status,
    agoraRoomId: booking.agoraRoomId,
    needsGuestEmailForComplete: booking.patient?.profileId == null,
  };
}
