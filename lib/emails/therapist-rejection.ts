import { brandHeader, emailShell, escapeHtml } from "@/lib/emails/partials";

export const therapistRejectionSubject = "Update on your Ealho application";

export function therapistRejectionHtml(reason?: string | null): string {
  const reasonBlock =
    reason?.trim() ?
      `<p style="margin:16px 0;font-size:15px;line-height:1.6;color:#3d3d3d;background:#f9f8f5;padding:14px 16px;border-radius:8px;border:1px solid #e8e6dd;">
        <strong>Reason:</strong><br/>${escapeHtml(reason.trim())}
      </p>`
    : "";

  const inner = `
  ${brandHeader()}
  <tr><td style="padding-top:28px;">
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#292612;">Thank you for applying to Ealho Therapy</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3d3d3d;">
      Unfortunately we are unable to approve your application at this time.
    </p>
    ${reasonBlock}
    <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#3d3d3d;">
      You may reapply in 30 days.
    </p>
  </td></tr>`;

  return emailShell(inner);
}
