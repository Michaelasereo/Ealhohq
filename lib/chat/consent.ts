import { prisma } from "@/lib/prisma/client";

export const CHAT_CONSENT_TYPES = [
  "platform_processing",
  "safety_scanning",
  "safety_override",
] as const;

export async function patientHasFullChatConsent(patientId: string): Promise<boolean> {
  const rows = await prisma.chatConsent.findMany({
    where: {
      patientId,
      consentVersion: "1.0",
      consentGiven: true,
      consentType: { in: [...CHAT_CONSENT_TYPES] },
    },
    select: { consentType: true },
  });
  return new Set(rows.map((r) => r.consentType)).size === CHAT_CONSENT_TYPES.length;
}
