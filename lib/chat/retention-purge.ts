import { randomUUID } from "crypto";

import { encryptMessage } from "@/lib/chat/encryption";
import { prisma } from "@/lib/prisma/client";

const PLACEHOLDER = "[Message removed]";

/** Placeholder actor for automated retention audit rows (no auth user). */
const RETENTION_SYSTEM_ACTOR = "00000000-0000-0000-0000-000000000001";

/**
 * Scrub all messages in a thread and mark the thread deleted (retention job).
 */
export async function purgeChatThreadContent(threadId: string): Promise<number> {
  const th = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { status: true },
  });
  if (!th || th.status !== "pending_deletion") {
    return 0;
  }

  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    select: { id: true },
  });
  if (messages.length === 0) {
    await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        status: "deleted",
        deletionScheduledAt: null,
        slaPatientMessageId: null,
        slaTherapistRemindedAt: null,
        slaAdminNotifiedAt: null,
      },
    });
    await prisma.chatAuditLog.create({
      data: {
        id: randomUUID(),
        threadId,
        actorId: RETENTION_SYSTEM_ACTOR,
        actorRole: "system",
        action: "retention_purge",
        metadata: { scrubbed: 0, empty: true } as object,
      },
    });
    return 0;
  }

  let scrubbed = 0;
  for (const m of messages) {
    const { encrypted, iv } = await encryptMessage(PLACEHOLDER);
    await prisma.chatMessage.update({
      where: { id: m.id },
      data: {
        content: encrypted,
        contentIv: iv,
        isDeleted: true,
        deletedAt: new Date(),
        isRead: true,
        isFlagged: false,
        flaggedAt: null,
        flagReason: null,
        riskLevel: null,
        riskType: null,
        isResolved: true,
        resolvedAt: new Date(),
        resolutionNote: "Retention purge",
        highRiskEscalatedAt: null,
      },
    });
    scrubbed++;
  }

  await prisma.chatThread.update({
    where: { id: threadId },
    data: {
      status: "deleted",
      deletionScheduledAt: null,
      slaPatientMessageId: null,
      slaTherapistRemindedAt: null,
      slaAdminNotifiedAt: null,
    },
  });

  await prisma.chatAuditLog.create({
    data: {
      id: randomUUID(),
      threadId,
      actorId: RETENTION_SYSTEM_ACTOR,
      actorRole: "system",
      action: "retention_purge",
      metadata: { scrubbed } as object,
    },
  });

  return scrubbed;
}
