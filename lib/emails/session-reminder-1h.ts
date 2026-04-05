import {
  brandHeader,
  emailShell,
  escapeHtml,
  mutedDisclaimer,
  primaryButton,
} from "@/lib/emails/partials";

export const sessionReminder1hSubject = "Your session starts in 1 hour";

export type SessionReminder1hParams = {
  therapistName: string;
  dateTimeLine: string;
  timeWat: string;
  durationLabel: string;
  joinUrl: string;
};

export function sessionReminder1hHtml(p: SessionReminder1hParams): string {
  const therapist = escapeHtml(p.therapistName);
  const dateLine = escapeHtml(p.dateTimeLine);
  const timeLine = escapeHtml(p.timeWat);
  const dur = escapeHtml(p.durationLabel);

  const inner = `
  ${brandHeader()}
  <tr><td style="padding-top:28px;">
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#b45309;">Starting soon — 1 hour ⏱️</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#3d3d3d;font-weight:600;">
      Your therapy session begins in one hour. Please join a few minutes early in a quiet space.
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d3d3d;">
      <strong>Therapist:</strong> ${therapist}<br/>
      <strong>Date:</strong> ${dateLine}<br/>
      <strong>Time (WAT):</strong> ${timeLine}<br/>
      <strong>Duration:</strong> ${dur}
    </p>
    ${primaryButton(p.joinUrl, "Join now")}
    ${mutedDisclaimer("This link is unique to you. Do not share it.")}
  </td></tr>`;

  return emailShell(inner);
}
