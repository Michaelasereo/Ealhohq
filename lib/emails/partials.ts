/** Shared HTML fragments for transactional emails (inline styles for client compatibility). */

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function emailShell(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ealho Therapy</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f3ef;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#24221e;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f3ef;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px 28px;box-shadow:0 4px 24px rgba(36,34,30,0.08);">
          ${inner}
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:#6b6b6b;">Ealho Therapy · <a href="https://ealhohq.com" style="color:#292612;">ealhohq.com</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function brandHeader(): string {
  return `<tr><td style="padding-bottom:24px;border-bottom:1px solid #e8e6dd;">
    <div style="font-size:22px;font-weight:700;letter-spacing:0.04em;color:#292612;">EALHO</div>
    <div style="font-size:13px;color:#474433;margin-top:4px;">Therapy</div>
  </td></tr>`;
}

export function primaryButton(href: string, label: string): string {
  const safe = escapeHtml(label);
  const url = escapeHtml(href);
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:10px;background:#292612;">
        <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#d6eae1;text-decoration:none;border-radius:10px;">${safe}</a>
      </td>
    </tr>
  </table>`;
}

export function mutedDisclaimer(text: string): string {
  return `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6b6b6b;">${escapeHtml(text)}</p>`;
}
