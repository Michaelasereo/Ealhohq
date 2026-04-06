import { REFERRAL_SESSION_RATE } from "@/lib/constants/session-rates";

type BookingLike = {
  isReferral: boolean;
  therapist: { sessionRate: unknown };
};

/**
 * Amount charged to the patient for Paystack / discount math (whole naira).
 */
export function chargeSessionRateNgn(booking: BookingLike): number {
  if (booking.isReferral) return REFERRAL_SESSION_RATE;
  return Math.round(Number(booking.therapist.sessionRate));
}
