/**
 * WhatsApp Cloud API — text message to E.164 without leading +.
 */
export async function sendWhatsAppText(params: {
  toE164Digits: string;
  body: string;
}): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneId) {
    console.warn("WhatsApp env missing; skipping WhatsApp");
    return false;
  }

  const to = params.toE164Digits.replace(/\D/g, "");

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: params.body },
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text();
    console.error("WhatsApp error:", res.status, t);
    return false;
  }
  return true;
}
