import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { prisma } from "@/lib/prisma/client";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";

function appBase(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, "") : "https://ealho.com";
}

/**
 * Finds chat threads where the latest message is from the patient and older than `hoursThreshold`.
 */
export async function findSlaBreachThreads(hoursThreshold: number) {
  const threads = await prisma.chatThread.findMany({
    where: {
      status: { in: ["active", "paused"] },
    },
    select: {
      id: true,
      patientId: true,
      therapistId: true,
      slaPatientMessageId: true,
      slaTherapistRemindedAt: true,
      slaAdminNotifiedAt: true,
      patient: { select: { fullName: true } },
      therapist: { include: { profile: true } },
    },
  });

  const now = Date.now();
  const ms = hoursThreshold * 60 * 60 * 1000;
  const breaches: {
    threadId: string;
    therapistId: string;
    patientFirstName: string;
    therapistName: string;
    therapistPhone: string | null;
    lastPatientMessageAt: Date;
    hoursWithoutReply: number;
    totalUnansweredMessages: number;
  }[] = [];

  for (const t of threads) {
    const last = await prisma.chatMessage.findFirst({
      where: { threadId: t.id, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, senderRole: true, createdAt: true },
    });
    if (!last || last.senderRole !== "patient") continue;
    const delta = now - last.createdAt.getTime();
    if (delta < ms) continue;

    const count = await prisma.chatMessage.count({
      where: {
        threadId: t.id,
        isDeleted: false,
        senderRole: "patient",
        createdAt: { gte: last.createdAt },
      },
    });

    breaches.push({
      threadId: t.id,
      therapistId: t.therapistId,
      patientFirstName: firstName(t.patient.fullName),
      therapistName: t.therapist.profile.fullName,
      therapistPhone: t.therapist.profile.phone,
      lastPatientMessageAt: last.createdAt,
      hoursWithoutReply: Math.floor(delta / (60 * 60 * 1000)),
      totalUnansweredMessages: count,
    });
  }

  return breaches;
}

export async function runChatSlaRemindersAndEscalations(): Promise<{
  therapistReminders: number;
  adminAlerts: number;
  highRiskReminders: number;
}> {
  let therapistReminders = 0;
  let adminAlerts = 0;
  let highRiskReminders = 0;
  const now = new Date();

  const threads = await prisma.chatThread.findMany({
    where: { status: { in: ["active", "paused"] } },
    select: { id: true },
  });

  const adminWa = normalizeNgDigits(process.env.ADMIN_WHATSAPP_NUMBER?.trim() ?? null);

  for (const { id: threadId } of threads) {
    const last = await prisma.chatMessage.findFirst({
      where: { threadId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: { id: true, senderRole: true, createdAt: true },
    });
    if (!last || last.senderRole !== "patient") {
      await prisma.chatThread.updateMany({
        where: { id: threadId },
        data: {
          slaPatientMessageId: null,
          slaTherapistRemindedAt: null,
          slaAdminNotifiedAt: null,
        },
      });
      continue;
    }

    const hours =
      (now.getTime() - last.createdAt.getTime()) / (60 * 60 * 1000);
    if (hours < 24) continue;

    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        patient: { select: { fullName: true } },
        therapist: { include: { profile: true } },
      },
    });
    if (!thread) continue;

    if (thread.slaPatientMessageId !== last.id) {
      await prisma.chatThread.update({
        where: { id: threadId },
        data: {
          slaPatientMessageId: last.id,
          slaTherapistRemindedAt: null,
          slaAdminNotifiedAt: null,
        },
      });
    }

    const fresh = await prisma.chatThread.findUnique({
      where: { id: threadId },
      select: {
        slaTherapistRemindedAt: true,
        slaAdminNotifiedAt: true,
      },
    });
    if (!fresh) continue;

    const tPhone = normalizeNgDigits(thread.therapist.profile.phone ?? null);
    if (!fresh.slaTherapistRemindedAt && tPhone) {
      await sendWhatsAppText({
        toE164Digits: tPhone,
        body: `Hi ${thread.therapist.profile.fullName.split(/\s+/)[0] ?? "Doctor"}, a patient is waiting for your reply on Ealho. Please check your messages:\n${appBase()}/therapist/messages`,
      });
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { slaTherapistRemindedAt: now },
      });
      therapistReminders++;
    }

    if (hours >= 48 && !fresh.slaAdminNotifiedAt && adminWa) {
      const pf = firstName(thread.patient.fullName);
      await sendWhatsAppText({
        toE164Digits: adminWa,
        body: `SLA Alert: ${thread.therapist.profile.fullName} has not replied to ${pf} for ${Math.floor(hours)} hours.\nReview: ${appBase()}/admin/chat`,
      });
      await prisma.chatThread.update({
        where: { id: threadId },
        data: { slaAdminNotifiedAt: now },
      });
      adminAlerts++;
    }
  }

  const clinical = normalizeNgDigits(
    process.env.CLINICAL_LEAD_WHATSAPP?.trim() ?? null,
  );
  if (clinical) {
    const stale = await prisma.chatMessage.findMany({
      where: {
        isFlagged: true,
        isResolved: false,
        riskLevel: "high",
        highRiskEscalatedAt: null,
        flaggedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        threadId: true,
        thread: {
          select: {
            patient: { select: { fullName: true } },
            therapist: { select: { profile: { select: { fullName: true } } } },
          },
        },
      },
    });

    for (const m of stale) {
      const pf = firstName(m.thread.patient.fullName);
      const dr = m.thread.therapist.profile.fullName;
      await sendWhatsAppText({
        toE164Digits: clinical,
        body: `Unresolved HIGH risk chat flag (>2h).\nPatient: ${pf} · ${dr}\n${appBase()}/admin/chat`,
      });
      await prisma.chatMessage.update({
        where: { id: m.id },
        data: { highRiskEscalatedAt: now },
      });
      highRiskReminders++;
    }
  }

  return { therapistReminders, adminAlerts, highRiskReminders };
}
