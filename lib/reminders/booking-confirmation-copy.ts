import { appBaseUrl } from "@/lib/app-url";

/** Appended to booking confirmation WhatsApp messages. */
export const BOOKING_SIGNUP_WHATSAPP_FOOTER = `

💡 *Want to manage your sessions easily?*
Create a free Ealho account at:
ealhohq.com/signup

Save time on your next booking and earn credits for multiple sessions.`;

export function signupUrlWithEmail(email: string | null | undefined): string {
  const base = appBaseUrl() || "https://ealhohq.com";
  const u = new URL("/signup", base.endsWith("/") ? base : `${base}/`);
  const e = email?.trim();
  if (e) u.searchParams.set("email", e);
  return u.toString();
}

export function buildBookingConfirmationWhatsAppBody(params: {
  recipientGreetingName: string;
  therapistName: string;
  dateLine: string;
  timeWat: string;
  joinUrl: string;
}): string {
  return `Hi ${params.recipientGreetingName}! 👋

Your therapy session is confirmed.

🗓 Date: ${params.dateLine}
🕐 Time: ${params.timeWat} WAT
👨‍⚕️ Therapist: ${params.therapistName}

Join here: ${params.joinUrl}

Reply HELP if you need to reschedule.${BOOKING_SIGNUP_WHATSAPP_FOOTER}`;
}
