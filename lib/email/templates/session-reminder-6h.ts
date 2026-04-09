import { emailMarkLogoImg } from "@/lib/emails/partials";

export function sessionReminder6h(params: {
  clientName: string;
  therapistName: string;
  time: string;
  sessionLink: string;
  isAnonymous?: boolean;
}): { subject: string; html: string } {
  const name = params.isAnonymous
    ? "there"
    : params.clientName.split(" ")[0];

  const checklist = [
    "Find a private, quiet space",
    "Test your camera and microphone",
    "Close other browser tabs",
    "Have water nearby",
  ];

  const checklistHtml = checklist
    .map(
      (item) => `
        <p style="font-size:12px;color:#555;
                  margin:0 0 6px;">
          ✓ &nbsp;${item}
        </p>`,
    )
    .join("");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
    "https://ealho.com";

  const headerLogo = emailMarkLogoImg({ maxHeightPx: 48, align: "center" });

  return {
    subject: `Your session is in 6 hours — ${params.time} WAT`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5F2EC;
             font-family:-apple-system,BlinkMacSystemFont,
             'Segoe UI',sans-serif;width:100% !important;height:auto !important;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#F5F2EC;">
    <tr>
      <td align="center" style="padding:32px 16px;height:auto !important;">
  <div style="max-width:520px;margin:0 auto;height:auto !important;">

    <div style="text-align:center;margin-bottom:24px;">
      ${headerLogo}
    </div>

    <div style="background:#FFFFFF;border-radius:16px;
                padding:32px;text-align:center;">

      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 16px;">
        <tr>
          <td align="center" valign="middle" style="width:56px;height:56px;background:#F5F2EC;border-radius:28px;font-size:24px;line-height:56px;">
            ⏰
          </td>
        </tr>
      </table>

      <h2 style="font-size:20px;font-weight:700;
                 color:#1A1A1A;margin:0 0 8px;">
        Your session is in 6 hours
      </h2>

      <p style="font-size:14px;color:#666;margin:0 0 8px;">
        With ${params.therapistName}
      </p>

      <p style="font-size:18px;font-weight:700;
                color:#2C3B2D;margin:0 0 24px;">
        Today at ${params.time} WAT
      </p>

      <a href="${params.sessionLink}"
         style="display:inline-block;background:#2C3B2D;
                color:#FFFFFF;padding:16px 40px;
                border-radius:12px;font-size:15px;
                font-weight:600;text-decoration:none;
                margin-bottom:16px;">
        Join Session →
      </a>

      <p style="font-size:12px;color:#999;margin:0 0 24px;">
        Click the button above at your session time.
        <br>No app download required.
      </p>

      <div style="background:#F5F2EC;border-radius:10px;
                  padding:16px;text-align:left;margin-bottom:8px;">
        <p style="font-size:12px;font-weight:700;
                  color:#1A1A1A;margin:0 0 10px;">
          Before you join:
        </p>
        ${checklistHtml}
      </div>

      <p style="font-size:11px;color:#BBB;margin:16px 0 0;">
        Need to reschedule?
        <a href="${appUrl}/sessions"
           style="color:#2C3B2D;">
          Manage your sessions
        </a>
      </p>
    </div>

    <p style="font-size:11px;color:#BBB;
              text-align:center;margin:16px 0 0;">
      Ealho Technologies Limited · Lagos, Nigeria
    </p>
  </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}
