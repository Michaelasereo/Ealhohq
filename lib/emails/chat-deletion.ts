import { emailMarkLogoImg } from "@/lib/emails/partials";

export function chatDeletionScheduledSubject(scheduledDateLabel: string): string {
  return `Ealho: your chat history will be removed on ${scheduledDateLabel}`;
}

export function chatDeletionScheduledHtml(params: {
  firstName: string;
  scheduledDateLabel: string;
  profileUrl: string;
}): string {
  const { firstName, scheduledDateLabel, profileUrl } = params;
  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  ${emailMarkLogoImg({ maxHeightPx: 40, align: "left" })}
  <p>Hi ${firstName},</p>
  <p>You requested to delete all of your therapy chat messages on Ealho. They will be permanently removed on <strong>${scheduledDateLabel}</strong> (West Africa Time).</p>
  <p>Until then you can still read your conversations, but you won’t be able to send new messages. To keep your chats, open your dashboard profile and cancel the deletion before that date.</p>
  <p><a href="${profileUrl}">Open profile & messaging settings</a></p>
  <p style="color:#666;font-size:14px;">If you didn’t request this, sign in and cancel immediately, or contact support.</p>
</body>
</html>`;
}

export function chatDeletionCompletedSubject(): string {
  return "Ealho: your chat history has been removed";
}

export function chatDeletionCompletedHtml(params: {
  firstName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  ${emailMarkLogoImg({ maxHeightPx: 40, align: "left" })}
  <p>Hi ${params.firstName},</p>
  <p>Your therapy chat messages on Ealho have been permanently removed as scheduled. Conversation records are no longer readable in the app.</p>
  <p style="color:#666;font-size:14px;">You can start a new conversation with your therapist after a future session if messaging is available.</p>
</body>
</html>`;
}
