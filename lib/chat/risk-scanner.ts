import Anthropic from "@anthropic-ai/sdk";

import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";

function parseRiskJson(text: string): {
  risk_level: "none" | "low" | "medium" | "high";
  risk_type: null | "self_harm" | "crisis" | "safeguarding";
  requires_immediate_action: boolean;
} {
  const t = text.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Invalid risk JSON");
  }
  return JSON.parse(t.slice(start, end + 1)) as {
    risk_level: "none" | "low" | "medium" | "high";
    risk_type: null | "self_harm" | "crisis" | "safeguarding";
    requires_immediate_action: boolean;
  };
}

function appBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, "") : "https://ealho.com";
}

export async function scanMessageForRisk(
  messageId: string,
  content: string,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    console.warn("scanMessageForRisk: ANTHROPIC_API_KEY not set");
    return;
  }

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    system: `You are a clinical safety monitor for a therapy platform. Scan this message for genuine safety risk indicators only.

Return ONLY valid JSON, nothing else:
{
  "risk_level": "none" | "low" | "medium" | "high",
  "risk_type": null | "self_harm" | "crisis" | "safeguarding",
  "requires_immediate_action": false | true
}

HIGH risk = explicit statements of intent to harm self or others, active suicidal ideation with plan.
MEDIUM risk = passive suicidal ideation, expressions of hopelessness with concerning themes.
LOW risk = general distress, sadness, frustration that warrants therapist awareness.
NONE = normal therapeutic conversation.

You are detecting risk only. Do not analyse therapeutic content. Do not store or repeat the message content in your response.`,
    messages: [{ role: "user", content }],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected Claude response");
  }
  const result = parseRiskJson(block.text);

  const flagged =
    result.risk_level === "high" || result.risk_level === "medium";

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      riskLevel: result.risk_level,
      riskType: result.risk_type,
      riskScanned: true,
      isFlagged: flagged,
      flaggedAt: flagged ? new Date() : null,
      flagReason: result.risk_type,
    },
  });

  if (result.requires_immediate_action) {
    await notifyHighRisk(messageId);
  }
}

async function notifyHighRisk(messageId: string): Promise<void> {
  const raw = process.env.CLINICAL_LEAD_WHATSAPP?.trim();
  const to = normalizeNgDigits(raw ?? null);
  if (!to) return;

  const msg = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      createdAt: true,
      thread: {
        select: {
          patient: { select: { fullName: true } },
          therapist: { select: { profile: { select: { fullName: true } } } },
        },
      },
    },
  });
  if (!msg?.thread) return;

  const pf = firstName(msg.thread.patient.fullName);
  const tLabel = therapistPublicLabel(msg.thread.therapist.profile.fullName);

  await sendWhatsAppText({
    toE164Digits: to,
    body: `HIGH RISK FLAG

A message has been flagged as high risk.
Client: ${pf} in thread with ${tLabel}
Time: ${msg.createdAt.toISOString()}

Please review immediately in admin dashboard:
${appBaseUrl()}/admin/chat`,
  });
}
