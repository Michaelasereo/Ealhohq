import { Resend } from "resend";

import {
  bookingConfirmationHtml,
  bookingConfirmationSubject,
  type BookingConfirmationParams,
} from "@/lib/emails/booking-confirmation";
import {
  sessionReminder1hHtml,
  sessionReminder1hSubject,
  type SessionReminder1hParams,
} from "@/lib/emails/session-reminder-1h";
import {
  sessionReminder24hHtml,
  sessionReminder24hSubject,
  type SessionReminderParams,
} from "@/lib/emails/session-reminder-24h";
import {
  therapistApprovalHtml,
  therapistApprovalSubject,
} from "@/lib/emails/therapist-approval";
import {
  therapistRejectionHtml,
  therapistRejectionSubject,
} from "@/lib/emails/therapist-rejection";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

/** Display name + address for Resend `from` field. */
export function getResendFromAddress(): string {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (raw) return raw;
  return "Ealho Therapy <noreply@ealho.com>";
}

export type SendEmailResult =
  | { success: true; messageId: string }
  | { success: false; error: string };

export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY missing; skipping email");
    return { success: false, error: "RESEND_API_KEY missing" };
  }

  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(params.text ? { text: params.text } : {}),
  });

  if (error) {
    console.error("Resend error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data?.id ?? "" };
}

/** Legacy helper for cron and simple call sites — returns boolean success only. */
export async function sendReminderEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const r = await sendTransactionalEmail(params);
  return r.success;
}

export async function sendBookingConfirmationEmail(
  to: string,
  layout: BookingConfirmationParams,
): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: bookingConfirmationSubject,
    html: bookingConfirmationHtml(layout),
  });
}

export async function sendSessionReminder24hEmail(
  to: string,
  layout: SessionReminderParams,
): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: sessionReminder24hSubject,
    html: sessionReminder24hHtml(layout),
  });
}

export async function sendSessionReminder1hEmail(
  to: string,
  layout: SessionReminder1hParams,
): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: sessionReminder1hSubject,
    html: sessionReminder1hHtml(layout),
  });
}

export async function sendTherapistApprovalEmail(
  to: string,
): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: therapistApprovalSubject,
    html: therapistApprovalHtml(),
  });
}

export async function sendTherapistRejectionEmail(
  to: string,
  reason?: string | null,
): Promise<SendEmailResult> {
  return sendTransactionalEmail({
    to,
    subject: therapistRejectionSubject,
    html: therapistRejectionHtml(reason),
  });
}
