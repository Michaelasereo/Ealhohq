import { brandHeader, emailShell, primaryButton } from "@/lib/emails/partials";
import { getAppOrigin } from "@/lib/emails/utils";

export const therapistApprovalSubject = "Your Ealho application has been approved";

export function therapistApprovalHtml(): string {
  const loginUrl = `${getAppOrigin()}/therapist/login`;
  const inner = `
  ${brandHeader()}
  <tr><td style="padding-top:28px;">
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#292612;">Welcome to Ealho Therapy 🎉</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3d3d3d;">
      Your application has been approved.
    </p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3d3d3d;">
      Log in to set up your profile and availability.
    </p>
    ${primaryButton(loginUrl, "Log in to your dashboard")}
  </td></tr>`;

  return emailShell(inner);
}
