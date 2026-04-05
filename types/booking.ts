/**
 * Client-side booking draft for the Paystack / slot-lock flow.
 * Persist only non-sensitive fields; server validates everything.
 */
export type BookingDraft = {
  therapistId: string;
  therapistName: string;
  profilePhoto: string | null;
  sessionRateFormatted: string;
  /** Whole naira for Paystack (matches therapist session rate). */
  sessionRateNaira: number;
  sessionDuration: number;
  date: string;
  startTime: string;
  endTime: string;
  sessionType?: "intake" | "followup";
  isGuest?: boolean;
  patientId?: string;
  bookingId?: string;
};
