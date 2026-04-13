import { withRetry } from "@/lib/retry";

export interface WhatsAppMessage {
  /** Nigerian phone number e.g. "08012345678" */
  to: string;
  /** Message text */
  body: string;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsApp(
  message: WhatsAppMessage,
): Promise<WhatsAppResult> {
  const provider = process.env.WHATSAPP_PROVIDER ?? "twilio";

  const phone = normalizeNigerianPhone(message.to);

  if (provider === "termii") {
    return sendViaTermii({ ...message, to: phone });
  }

  if (provider === "twilio") {
    return sendViaTwilio({ ...message, to: phone });
  }

  if (provider === "dev") {
    console.log("📱 [WhatsApp DEV]", phone, message.body);
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  console.log("📱 [WhatsApp DEV]", phone, message.body);
  return { success: true, messageId: `dev_${Date.now()}` };
}

function normalizeNigerianPhone(phone: string): string {
  let clean = phone.replace(/[\s\-()]/g, "");

  if (clean.startsWith("0")) {
    clean = `234${clean.slice(1)}`;
  }
  if (clean.startsWith("+")) {
    clean = clean.slice(1);
  }

  return clean;
}

async function sendViaTwilio(
  message: WhatsAppMessage & { to: string },
): Promise<WhatsAppResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_WHATSAPP_FROM!;

    const response = await withRetry(
      () =>
        fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization:
                "Basic " +
                Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: from,
              To: `whatsapp:+${message.to}`,
              Body: message.body,
            }).toString(),
          },
        ),
      { attempts: 2, delayMs: 800 },
    );

    const data = (await response.json()) as { sid?: string; message?: string };

    if (!response.ok) {
      return { success: false, error: data.message ?? "Twilio error" };
    }

    return { success: true, messageId: data.sid };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function sendViaTermii(
  message: WhatsAppMessage & { to: string },
): Promise<WhatsAppResult> {
  try {
    const response = await withRetry(
      () =>
        fetch("https://api.ng.termii.com/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: process.env.TERMII_API_KEY,
            to: message.to,
            from: process.env.TERMII_SENDER_ID ?? "Ealho",
            sms: message.body,
            type: "plain",
            channel: "whatsapp",
          }),
        }),
      { attempts: 2, delayMs: 800 },
    );

    const data = (await response.json()) as {
      code?: string;
      message?: string;
      message_id?: string;
    };

    if (data.code !== "ok") {
      return { success: false, error: data.message ?? "Termii error" };
    }

    return { success: true, messageId: data.message_id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
