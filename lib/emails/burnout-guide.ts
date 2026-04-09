export const burnoutGuideEmailSubject = "Your Ealho burnout guide (PDF)";

export function burnoutGuideEmailHtml(params: { firstName: string }): string {
  const name = params.firstName.trim() || "there";
  return `<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #24221e; max-width: 560px;">
  <p>Hi ${escapeHtml(name)},</p>
  <p>Thanks for your interest. Your burnout guide is attached to this email as a PDF.</p>
  <p>If you don&apos;t see it, check your spam folder or reply to this message and we&apos;ll help.</p>
  <p style="margin-top: 24px;">Warm regards,<br/>The Ealho team</p>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
