import { emailMarkLogoImg } from "@/lib/emails/partials";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function therapistNewBookingEmail(params: {
  therapistFirstName: string;
  patientDisplay: string;
  date: string;
  time: string;
  sessionTypeLabel: string;
  isAnonymous: boolean;
  bookingReason?: string | null;
  professionalType?: string | null;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const reasonLine =
    params.bookingReason?.trim()
      ? `<p style="margin:0 0 8px;font-size:14px;color:#292612;"><strong>What they shared (reason)</strong><br/><span style="color:#444;">${escapeHtml(params.bookingReason.trim())}</span></p>`
      : `<p style="margin:0 0 8px;font-size:13px;color:#666;">What they shared: ${params.isAnonymous ? "(anonymous flow — see dashboard)" : "(not provided)"}</p>`;

  const professionalLine =
    params.professionalType?.trim()
      ? `<p style="margin:0 0 16px;font-size:14px;color:#292612;"><strong>Client professional background</strong><br/><span style="color:#444;">${escapeHtml(params.professionalType.trim())}</span></p>`
      : `<p style="margin:0 0 16px;font-size:13px;color:#666;">Client professional background: (not provided)</p>`;

  const anonBanner = params.isAnonymous
    ? `<p style="margin:0 0 16px;padding:10px 12px;background:#F0F4F0;border-radius:8px;font-size:13px;color:#1E3D2F;"><strong>Anonymous booking</strong> — the client is using an alias. Full details appear in your therapist dashboard.</p>`
    : "";

  const headerLogo = emailMarkLogoImg({ maxHeightPx: 40, align: "left" });

  const subjectClient =
    params.patientDisplay.length > 48
      ? `${params.patientDisplay.slice(0, 45)}…`
      : params.patientDisplay;

  return {
    subject: `New session booked — ${subjectClient}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 16px;">
    ${headerLogo}
    <h1 style="font-size:18px;font-weight:600;color:#292612;margin:16px 0 8px;">New session booked</h1>
    <p style="margin:0 0 16px;font-size:14px;color:#444;">Hi ${escapeHtml(params.therapistFirstName)}, someone just booked a session with you.</p>
    ${anonBanner}
    <p style="margin:0 0 8px;font-size:14px;color:#292612;"><strong>Client</strong><br/>${escapeHtml(params.patientDisplay)}</p>
    ${reasonLine}
    ${professionalLine}
    <p style="margin:0 0 8px;font-size:14px;color:#292612;"><strong>When</strong><br/>${escapeHtml(params.date)} · ${escapeHtml(params.time)} WAT</p>
    <p style="margin:0 0 20px;font-size:14px;color:#292612;"><strong>Session</strong><br/>${escapeHtml(params.sessionTypeLabel)}</p>
    <a href="${escapeHtml(params.dashboardUrl)}" style="display:inline-block;padding:12px 20px;background:#292612;color:#D6EAE1;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open dashboard</a>
    <p style="margin:24px 0 0;font-size:12px;color:#888;">You will also get a WhatsApp alert if your phone is on file.</p>
  </div>
</body>
</html>`,
  };
}
