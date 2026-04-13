import { escapeHtml, emailMarkLogoImg } from "@/lib/emails/partials";

export function partnerStaffInviteSubject(partnerName: string): string {
  const p = partnerName.trim() || "Partner";
  return `Your Professional Resilience Sessions are available: Courtesy ${p} × Ealho Therapy`;
}

export function partnerStaffInviteHtml(params: {
  firstName: string;
  partnerName: string;
  partnerLogoUrl: string | null;
  inviteCode: string;
  setupLink: string;
}): string {
  const first = escapeHtml(params.firstName);
  const partner = escapeHtml(params.partnerName);
  const code = escapeHtml(params.inviteCode);
  const setupLink = escapeHtml(params.setupLink);

  const partnerLogoBlock = params.partnerLogoUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin:0;"><tr><td style="padding:0;line-height:0;">
        <img src="${escapeHtml(params.partnerLogoUrl)}" alt="${partner}" height="44" style="display:block;max-height:44px;max-width:200px;border:0;" />
      </td></tr></table>`
    : `<p style="margin:0;font-size:17px;font-weight:600;color:#292612;line-height:1.3;max-width:180px;">${partner}</p>`;

  const ealhoLogoBlock = emailMarkLogoImg({ maxHeightPx: 44, align: "right" });

  const headline = `Your Professional Resilience Sessions are available: Courtesy ${partner} × Ealho Therapy`;

  return `
<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:28px;border-collapse:collapse;">
    <tr>
      <td valign="middle" align="left" style="width:38%;padding:4px 8px 4px 0;">
        ${partnerLogoBlock}
      </td>
      <td valign="middle" align="center" style="width:24%;padding:4px 4px;font-size:22px;font-weight:300;color:#9ca3af;line-height:1;">
        ×
      </td>
      <td valign="middle" align="right" style="width:38%;padding:4px 0 4px 8px;">
        ${ealhoLogoBlock}
      </td>
    </tr>
  </table>
  <h2 style="font-size: 18px; font-weight: 600; color: #111; margin: 0 0 12px; line-height: 1.35;">
    ${headline}
  </h2>
  <p style="color: #555; margin-bottom: 24px; line-height: 1.6;">
    Hi ${first},
    <br /><br />
    ${partner} has partnered with Ealho Therapy to give you access to professional resilience support.
    Use the verification code below to set up your account.
  </p>
  <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
    <p style="color: #666; font-size: 14px; margin: 0 0 8px;">Your verification code</p>
    <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #292612; margin: 0;">${code}</p>
    <p style="color: #999; font-size: 12px; margin: 8px 0 0;">Expires in 48 hours</p>
  </div>
  <a href="${setupLink}"
     style="display: block; background: #292612; color: #d6eae1; text-align: center; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">
    Set up your account →
  </a>
  <p style="color: #999; font-size: 12px; text-align: center; word-break: break-all;">${setupLink}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #bbb; font-size: 12px; text-align: center;">
    ${partner} × Ealho Therapy
  </p>
</div>`;
}
