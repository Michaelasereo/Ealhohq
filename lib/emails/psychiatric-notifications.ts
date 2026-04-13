import { getAppOrigin } from "@/lib/emails/utils";

export function psychPatientInviteEmailHtml(opts: {
  psychiatristName: string;
  dateLabel: string;
  timeLabel: string;
  durationMins: number;
}) {
  const origin = getAppOrigin();
  const dash = `${origin}/dashboard`;
  return `
  <p>Hi,</p>
  <p>Your therapist has recommended a one-time psychiatric assessment with <strong>${escapeHtml(opts.psychiatristName)}</strong>.</p>
  <p><strong>When:</strong> ${escapeHtml(opts.dateLabel)} at ${escapeHtml(opts.timeLabel)} WAT<br/>
  <strong>Duration:</strong> ${opts.durationMins} minutes</p>
  <p>Please open your dashboard to accept or decline this invitation (you may need to complete payment or use credits).</p>
  <p><a href="${dash}">Open dashboard</a></p>
  <p>— Ealho Therapy</p>
  `;
}

export function psychPsychiatristBookingEmailHtml(opts: {
  psychiatristName: string;
  dateLabel: string;
  timeLabel: string;
  clinicalReason: string;
  therapistName: string;
}) {
  return `
  <p>Hi Dr ${escapeHtml(opts.psychiatristName)},</p>
  <p>A psychiatric assessment has been scheduled.</p>
  <p><strong>When:</strong> ${escapeHtml(opts.dateLabel)} at ${escapeHtml(opts.timeLabel)} WAT</p>
  <p><strong>Referring therapist:</strong> ${escapeHtml(opts.therapistName)}</p>
  <p><strong>Referral summary (from therapist):</strong></p>
  <blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:8px 0;">${escapeHtml(opts.clinicalReason)}</blockquote>
  <p>You will receive the video join link from the platform when the client confirms.</p>
  <p>— Ealho Therapy</p>
  `;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
