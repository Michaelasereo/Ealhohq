import {
  brandHeader,
  emailShell,
  escapeHtml,
  mutedDisclaimer,
  primaryButton,
} from "@/lib/emails/partials";

export const sessionReminder24hSubject = "Your therapy session is tomorrow";

export type SessionReminderParams = {
  therapistName: string;
  dateTimeLine: string;
  timeWat: string;
  durationLabel: string;
  joinUrl: string;
};

export function sessionReminder24hHtml(p: SessionReminderParams): string {
  const therapist = escapeHtml(p.therapistName);
  const dateLine = escapeHtml(p.dateTimeLine);
  const timeLine = escapeHtml(p.timeWat);
  const dur = escapeHtml(p.durationLabel);

  const inner = `
  ${brandHeader()}
  <tr><td style="padding-top:28px;">
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#292612;">Your session is tomorrow ✅</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d3d3d;">
      <strong>Therapist:</strong> ${therapist}<br/>
      <strong>Date:</strong> ${dateLine}<br/>
      <strong>Time (WAT):</strong> ${timeLine}<br/>
      <strong>Duration:</strong> ${dur}
    </p>
    ${primaryButton(p.joinUrl, "Join your session")}
    ${mutedDisclaimer("This link is unique to you. Do not share it.")}
  </td></tr>`;

  return emailShell(inner);
}
