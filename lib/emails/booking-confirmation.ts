import {
  brandHeader,
  emailShell,
  escapeHtml,
  mutedDisclaimer,
  primaryButton,
} from "@/lib/emails/partials";

export const bookingConfirmationSubject = "Your Ealho Therapy session is confirmed";

export type BookingConfirmationParams = {
  therapistName: string;
  dateTimeLine: string;
  timeWat: string;
  durationLabel: string;
  joinUrl: string;
  signupUrl: string;
};

function makeTheMostSection(signupUrl: string): string {
  const url = escapeHtml(signupUrl);
  const benefits = [
    "View and manage all your sessions in one place",
    "Rebook in seconds — details saved automatically",
    "Earn credits and save up to 20% on sessions",
    "Session reminders on WhatsApp and email",
    "Secure session history, always accessible",
  ];
  const list = benefits
    .map(
      (b) =>
        `<li style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#3d3d3d;">${escapeHtml(b)}</li>`,
    )
    .join("");

  return `
  <tr><td style="padding-top:28px;border-top:1px solid #e8e6dd;">
    <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#292612;">Make the most of Ealho</h2>
    <ul style="margin:0 0 16px;padding-left:20px;">${list}</ul>
    ${primaryButton(url, "Create Your Free Account")}
  </td></tr>`;
}

export function bookingConfirmationHtml(p: BookingConfirmationParams): string {
  const therapist = escapeHtml(p.therapistName);
  const dateLine = escapeHtml(p.dateTimeLine);
  const timeLine = escapeHtml(p.timeWat);
  const dur = escapeHtml(p.durationLabel);

  const inner = `
  ${brandHeader()}
  <tr><td style="padding-top:28px;">
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#292612;">Your session is confirmed ✅</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3d3d3d;">
      <strong>Therapist:</strong> ${therapist}<br/>
      <strong>Date:</strong> ${dateLine}<br/>
      <strong>Time (WAT):</strong> ${timeLine}<br/>
      <strong>Duration:</strong> ${dur}
    </p>
    ${primaryButton(p.joinUrl, "Join your session")}
    ${mutedDisclaimer("This link is unique to you. Do not share it.")}
  </td></tr>
  ${makeTheMostSection(p.signupUrl)}`;

  return emailShell(inner);
}
