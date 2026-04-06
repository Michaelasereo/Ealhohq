import {
  chatDeletionCompletedHtml,
  chatDeletionCompletedSubject,
} from "@/lib/emails/chat-deletion";
import { purgeChatThreadContent } from "@/lib/chat/retention-purge";
import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";
import { prisma } from "@/lib/prisma/client";

function appBase(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, "") : "https://ealho.com";
}

/**
 * Purges due threads and notifies each client once (email + WhatsApp when configured).
 */
export async function runDataRetentionCron(): Promise<{
  threadsPurged: number;
  messagesScrubbed: number;
  patientsNotified: number;
}> {
  const now = new Date();
  const due = await prisma.chatThread.findMany({
    where: {
      status: "pending_deletion",
      deletionScheduledAt: { lte: now },
    },
    include: { patient: true },
    orderBy: { deletionScheduledAt: "asc" },
  });

  let messagesScrubbed = 0;
  const notifiedPatients = new Set<string>();

  for (const t of due) {
    const n = await purgeChatThreadContent(t.id);
    messagesScrubbed += n;

    if (notifiedPatients.has(t.patientId)) continue;
    notifiedPatients.add(t.patientId);

    const pf = firstName(t.patient.fullName);
    void sendTransactionalEmail({
      to: t.patient.email,
      subject: chatDeletionCompletedSubject(),
      html: chatDeletionCompletedHtml({ firstName: pf }),
      text: `Hi ${pf}, your therapy chat messages on Ealho have been permanently removed as scheduled. ${appBase()}`,
    });

    const wa = normalizeNgDigits(t.patient.phone ?? null);
    if (wa) {
      void sendWhatsAppText({
        toE164Digits: wa,
        body: `Ealho: Your therapy chat messages have been permanently removed as you requested. ${appBase()}`,
      });
    }
  }

  return {
    threadsPurged: due.length,
    messagesScrubbed,
    patientsNotified: notifiedPatients.size,
  };
}
