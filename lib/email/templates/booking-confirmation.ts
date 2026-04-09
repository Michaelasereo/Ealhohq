import { emailMarkLogoImg } from "@/lib/emails/partials";

export function generateGoogleCalendarLink(params: {
  title: string;
  startDateTime: string;
  endDateTime: string;
  description: string;
  location: string;
}): string {
  const start = params.startDateTime
    .replace(/[-:]/g, "")
    .replace(".000Z", "Z");
  const end = params.endDateTime.replace(/[-:]/g, "").replace(".000Z", "Z");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(params.title)}&dates=${start}/${end}&details=${encodeURIComponent(params.description)}&location=${encodeURIComponent(params.location)}`;
}

export function bookingConfirmation(params: {
  clientName: string;
  therapistName: string;
  date: string;
  time: string;
  duration: number;
  sessionLink: string;
  /** Google Calendar “add event” URL */
  calendarUrl: string;
  isAnonymous?: boolean;
  isReferral?: boolean;
  referrerName?: string;
}): { subject: string; html: string } {
  const name = params.isAnonymous
    ? "there"
    : params.clientName.split(" ")[0];

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ??
    "https://ealho.com";

  const safetyRules = [
    "Never share your account password or session link with anyone",
    "All sessions happen on the Ealho platform only — never move to WhatsApp, Zoom, or any other platform",
    "Your therapist will never ask to meet you outside of Ealho or request payment directly",
    "Do not share personal financial information with your therapist",
    "If anything feels wrong, end the session and report it at safety@ealho.com",
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

  const referralLine =
    params.isReferral && params.referrerName?.trim()
      ? `<p style="font-size:13px;color:#555;margin:0 0 16px;">Referred by ${params.referrerName.trim()}</p>`
      : "";

  const headerLogo = emailMarkLogoImg({ maxHeightPx: 48, align: "center" });

  return {
    subject: "Your session is confirmed — Ealho Therapy",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;width:100% !important;height:auto !important;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#F5F2EC;">
    <tr>
      <td align="center" style="padding:32px 16px;height:auto !important;">
  <div style="max-width:520px;margin:0 auto;height:auto !important;">

    <div style="text-align:center;margin-bottom:24px;">
      ${headerLogo}
    </div>

    <div style="background:#FFFFFF;border-radius:16px;padding:32px;margin-bottom:16px;">

      <p style="font-size:15px;color:#2C3B2D;margin:0 0 8px;font-weight:700;">
        ✓ Confirmed
      </p>
      <p style="font-size:15px;color:#555;margin:0 0 24px;">
        Hi ${name},
      </p>

      ${referralLine}

      <p style="font-size:15px;color:#555;margin:0 0 24px;line-height:1.6;">
        Your therapy session is booked. Here are your details:
      </p>

      <div style="background:#F5F2EC;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#888;font-size:13px;width:100px;">Therapist</td>
            <td style="padding:6px 0;color:#1A1A1A;font-size:13px;font-weight:600;">
              ${params.therapistName}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#888;font-size:13px;">Date</td>
            <td style="padding:6px 0;color:#1A1A1A;font-size:13px;font-weight:600;">
              ${params.date}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#888;font-size:13px;">Time</td>
            <td style="padding:6px 0;color:#1A1A1A;font-size:13px;font-weight:600;">
              ${params.time} WAT
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#888;font-size:13px;">Duration</td>
            <td style="padding:6px 0;color:#1A1A1A;font-size:13px;font-weight:600;">
              ${params.duration} minutes
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${params.sessionLink}"
           style="display:inline-block;background:#2C3B2D;
                  color:#FFFFFF;padding:14px 32px;
                  border-radius:10px;font-size:15px;
                  font-weight:600;text-decoration:none;">
          Join Session →
        </a>
      </div>

      <p style="font-size:14px;color:#666;margin:0 0 8px;line-height:1.6;">
        Your session link will work from 10 minutes before your scheduled time. We'll send you
        a reminder 24 hours and 6 hours before.
      </p>

      <p style="font-size:12px;margin:0 0 24px;">
        <a href="${params.calendarUrl}" style="color:#2C3B2D;font-weight:600;">Add to your calendar</a>
        (Google Calendar)
      </p>

      <div style="background:#FFF8E7;border:1px solid #F5E6A3;
                  border-radius:12px;padding:20px;margin-bottom:8px;">
        <p style="font-size:13px;font-weight:700;color:#92650A;margin:0 0 12px;">
          ⚠️ Platform safety guidelines
        </p>
        <table style="width:100%;">
          ${safetyRows}
        </table>
      </div>

    </div>

    <div style="background:#FFF0F0;border:1px solid #FFD5D5;
                border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="font-size:12px;color:#C0392B;font-weight:700;margin:0 0 6px;">
        In crisis? You don't have to wait for your session.
      </p>
      <p style="font-size:12px;color:#C0392B;margin:0;">
        Nigeria Suicide Prevention Helpline:
        <strong>0800-800-2000</strong> (free, 24/7)
        <br>Or email us: <strong>safety@ealho.com</strong>
      </p>
    </div>

    <p style="font-size:11px;color:#BBB;text-align:center;margin:0;line-height:1.8;">
      Ealho Technologies Limited · Lagos, Nigeria<br>
      <a href="${appUrl}/privacy" style="color:#BBB;">Privacy Policy</a>
      ·
      <a href="${appUrl}/terms" style="color:#BBB;">Terms of Service</a>
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
