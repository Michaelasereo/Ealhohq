export function rebookInvitationSubject(therapistName: string): string {
  return `${therapistName} suggested your next Ealho session`;
}

export function rebookInvitationHtml(params: {
  patientFirstName: string;
  therapistName: string;
  dateLine: string;
  timeLine: string;
  durationMins: number;
  sessionTypeLabel: string;
  confirmUrl: string;
  message?: string | null;
}): string {
  const note = params.message?.trim()
    ? `<p style="margin:16px 0;color:#444;">${escapeHtml(params.message.trim())}</p>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
<p>Hi ${escapeHtml(params.patientFirstName)},</p>
<p><strong>${escapeHtml(params.therapistName)}</strong> has suggested your next therapy session:</p>
<ul style="line-height:1.6;">
<li><strong>Date:</strong> ${escapeHtml(params.dateLine)}</li>
<li><strong>Time:</strong> ${escapeHtml(params.timeLine)} WAT</li>
<li><strong>Duration:</strong> ${params.durationMins} minutes</li>
<li><strong>Type:</strong> ${escapeHtml(params.sessionTypeLabel)}</li>
</ul>
${note}
<p>This invitation expires in <strong>48 hours</strong>.</p>
<p><a href="${params.confirmUrl}" style="display:inline-block;background:#292612;color:#d6eae1;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Confirm and pay</a></p>
<p style="font-size:13px;color:#666;">If the button does not work, copy this link:<br/>${params.confirmUrl}</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
