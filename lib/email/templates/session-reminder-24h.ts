import { emailMarkLogoImg } from "@/lib/emails/partials";

export function sessionReminder24h(params: {
  clientName: string;
  therapistName: string;
  date: string;
  time: string;
  duration: number;
  sessionLink: string;
  isAnonymous?: boolean;
  isFirstSession?: boolean;
}): { subject: string; html: string } {
  const name = params.isAnonymous
    ? "there"
    : params.clientName.split(" ")[0];

  const tips = [
    ["🔇", "Find a quiet, private space — headphones recommended"],
    ["📱", "Test your camera and microphone before joining"],
    ["💧", "Have water nearby — sessions can be emotionally engaging"],
    ["📝", "There's no right or wrong thing to say — just be yourself"],
  ];

  const tipsRows = tips
    .map(
      ([icon, tip]) => `
          <tr>
            <td style="padding:4px 8px 4px 0;
                       font-size:18px;vertical-align:top;width:28px;">
              ${icon}
            </td>
            <td style="padding:4px 0;font-size:13px;
                       color:#555;line-height:1.5;">
              ${tip}
            </td>
          </tr>`,
    )
    .join("");

  const safetyRules = [
    "Never share your account password or session link with anyone",
    "All sessions happen on the Ealho platform only — never move to WhatsApp, Zoom, or any other platform",
    "Your therapist will never ask to meet you outside of Ealho or request payment directly",
    "Do not share personal financial information with your therapist",
    "If anything feels wrong, end the session and report it at safety@ealhohq.com",
  ];

  const safetyRows = safetyRules
    .map(
      (rule) => `
          <tr>
            <td style="padding:3px 8px 3px 0;
                       font-size:18px;vertical-align:top;width:20px;">
              •
            </td>
            <td style="padding:3px 0;font-size:12px;
                       color:#7A5500;line-height:1.5;">
              ${rule}
            </td>
          </tr>`,
    )
    .join("");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
    "https://ealhohq.com";

  const headerLogo = emailMarkLogoImg({ maxHeightPx: 48, align: "center" });

  const firstSessionBlock = params.isFirstSession
    ? `
      <div style="border-top:1px solid #F0EDE8;
                  padding-top:24px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:700;color:#1A1A1A;
                  margin:0 0 12px;">
          Tips for your first session
        </p>
        <table style="width:100%;">
          ${tipsRows}
        </table>
      </div>
      `
    : "";

  return {
    subject: `Your session tomorrow at ${params.time} — Ealho Therapy`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;margin-bottom:32px;">
      ${headerLogo}
    </div>

    <div style="background:#FFFFFF;border-radius:16px;
                padding:32px;margin-bottom:16px;">

      <p style="font-size:15px;color:#555;margin:0 0 24px;">
        Hi ${name},
      </p>

      <p style="font-size:15px;color:#555;margin:0 0 24px;
                line-height:1.6;">
        Your therapy session is tomorrow. Here are your details:
      </p>

      <div style="background:#F5F2EC;border-radius:12px;
                  padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#888;
                       font-size:13px;width:100px;">Therapist</td>
            <td style="padding:6px 0;color:#1A1A1A;
                       font-size:13px;font-weight:600;">
              ${params.therapistName}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#888;font-size:13px;">Date</td>
            <td style="padding:6px 0;color:#1A1A1A;
                       font-size:13px;font-weight:600;">
              ${params.date}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#888;font-size:13px;">Time</td>
            <td style="padding:6px 0;color:#1A1A1A;
                       font-size:13px;font-weight:600;">
              ${params.time} WAT
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#888;font-size:13px;">
              Duration
            </td>
            <td style="padding:6px 0;color:#1A1A1A;
                       font-size:13px;font-weight:600;">
              ${params.duration} minutes
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:32px;">
        <a href="${params.sessionLink}"
           style="display:inline-block;background:#2C3B2D;
                  color:#FFFFFF;padding:14px 32px;
                  border-radius:10px;font-size:15px;
                  font-weight:600;text-decoration:none;">
          Join Session →
        </a>
        <p style="font-size:11px;color:#999;margin:8px 0 0;">
          Save this link — you'll need it to join tomorrow
        </p>
      </div>

      ${firstSessionBlock}

      <div style="background:#FFF8E7;border:1px solid #F5E6A3;
                  border-radius:12px;padding:20px;margin-bottom:8px;">
        <p style="font-size:13px;font-weight:700;color:#92650A;
                  margin:0 0 12px;">
          ⚠️ Platform safety guidelines
        </p>
        <table style="width:100%;">
          ${safetyRows}
        </table>
      </div>

    </div>

    <div style="background:#FFF0F0;border:1px solid #FFD5D5;
                border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="font-size:12px;color:#C0392B;
                font-weight:700;margin:0 0 6px;">
        In crisis? You don't have to wait for your session.
      </p>
      <p style="font-size:12px;color:#C0392B;margin:0;">
        Nigeria Suicide Prevention Helpline:
        <strong>0800-800-2000</strong> (free, 24/7)
        <br>Or email us: <strong>safety@ealhohq.com</strong>
      </p>
    </div>

    <p style="font-size:11px;color:#BBB;text-align:center;
              margin:0;line-height:1.8;">
      Ealho Technologies Limited · Lagos, Nigeria<br>
      <a href="${appUrl}/privacy"
         style="color:#BBB;">Privacy Policy</a>
      ·
      <a href="${appUrl}/terms"
         style="color:#BBB;">Terms of Service</a>
    </p>

  </div>
</body>
</html>
    `,
  };
}
