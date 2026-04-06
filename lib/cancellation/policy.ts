import { hoursUntilSessionStart } from "@/lib/cancellation/hours-until";

export type RefundType = "full" | "partial" | "none";

export type CancellationPolicyResult = {
  refundType: RefundType;
  /** Whole or fractional session credits to return (0, 0.5, 1, or 2 for therapist-cancel bonus cases). */
  refundCredits: number;
  /** Extra complimentary credits (e.g. therapist cancel goodwill). */
  bonusCredits: number;
  message: string;
};

/** Client-initiated cancellation (server-side). */
export function getClientCancellationPolicy(
  sessionDate: Date,
  startTime: string,
  paidWithCredits: boolean,
): CancellationPolicyResult {
  const hoursUntil = hoursUntilSessionStart(sessionDate, startTime);

  if (hoursUntil <= 0) {
    return {
      refundType: "none",
      refundCredits: 0,
      bonusCredits: 0,
      message: "This session is in the past or has already started.",
    };
  }

  if (hoursUntil > 24) {
    return {
      refundType: "full",
      refundCredits: paidWithCredits ? 1 : 0,
      bonusCredits: 0,
      message: paidWithCredits
        ? "Full credit refund — cancelled more than 24 hours before the session."
        : "Full refund will be processed within 5–7 business days to your original payment method.",
    };
  }

  if (hoursUntil > 2) {
    if (paidWithCredits) {
      return {
        refundType: "partial",
        refundCredits: 0.5,
        bonusCredits: 0,
        message:
          "50% credit refund (0.5 session credit) — cancelled between 2 and 24 hours before the session. Card payments are not refunded in this window.",
      };
    }
    return {
      refundType: "none",
      refundCredits: 0,
      bonusCredits: 0,
      message:
        "No refund for card payments when cancelling between 2 and 24 hours before the session. Credit bookings receive a partial credit refund.",
    };
  }

  return {
    refundType: "none",
    refundCredits: 0,
    bonusCredits: 0,
    message:
      "No refund — cancelled within 2 hours of the session start. No-shows are also non-refundable.",
  };
}

/** Therapist cancelled — full refund + one complimentary credit. */
export function getTherapistCancellationPolicy(
  paidWithCredits: boolean,
): CancellationPolicyResult {
  return {
    refundType: "full",
    refundCredits: paidWithCredits ? 1 : 0,
    bonusCredits: 1,
    message:
      "Your therapist cancelled this session. You receive a full refund where applicable plus one complimentary session credit.",
  };
}

/** Platform / force majeure */
export function getPlatformCancellationPolicy(
  paidWithCredits: boolean,
): CancellationPolicyResult {
  return {
    refundType: "full",
    refundCredits: paidWithCredits ? 1 : 0,
    bonusCredits: 1,
    message:
      "We could not deliver this session due to a platform issue. You receive a full refund where applicable plus one complimentary credit.",
  };
}
