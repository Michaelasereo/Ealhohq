import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";

export function chatAppBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, "") : "https://ealho.com";
}

export async function notifyNewChatMessage(opts: {
  toTherapist: boolean;
  recipientPhone: string | null | undefined;
  otherPartyFullName: string;
  threadId: string;
}): Promise<void> {
  const phone = normalizeNgDigits(opts.recipientPhone ?? null);
  if (!phone) return;
  const base = chatAppBaseUrl();
  if (opts.toTherapist) {
    const pf = firstName(opts.otherPartyFullName);
    await sendWhatsAppText({
      toE164Digits: phone,
      body: `💬 New message from ${pf}
Open Ealho to reply:
${base}/therapist/messages?thread=${opts.threadId}`,
    });
  } else {
    const label = therapistPublicLabel(opts.otherPartyFullName);
    await sendWhatsAppText({
      toE164Digits: phone,
      body: `💬 ${label} sent you a message
${base}/messages?thread=${opts.threadId}`,
    });
  }
}
