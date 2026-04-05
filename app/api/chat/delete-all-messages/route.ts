import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { deletionScheduledAtFromNow } from "@/lib/chat/deletion-schedule";
import {
  chatDeletionScheduledHtml,
  chatDeletionScheduledSubject,
} from "@/lib/emails/chat-deletion";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function appBase(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, "") : "https://ealho.com";
}

const bodySchema = z
  .object({
    action: z.enum(["schedule", "cancel"]),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role as string | undefined;
    if (role !== "patient") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const patient = await ensureRegisteredPatientForUser(user);
    if (!patient) {
      return NextResponse.json(
        { error: "Patient profile required" },
        { status: 403 },
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    if (parsed.data.action === "cancel") {
      const pendingIds = await prisma.chatThread.findMany({
        where: {
          patientId: patient.id,
          status: "pending_deletion",
        },
        select: { id: true },
        take: 1,
      });

      const updated = await prisma.chatThread.updateMany({
        where: {
          patientId: patient.id,
          status: "pending_deletion",
        },
        data: {
          status: "active",
          deletionScheduledAt: null,
        },
      });

      const anchorId = pendingIds[0]?.id;
      if (anchorId) {
        await prisma.chatAuditLog.create({
          data: {
            id: randomUUID(),
            threadId: anchorId,
            actorId: user.id,
            actorRole: "patient",
            action: "chat_deletion_cancelled",
            metadata: { restoredThreads: updated.count } as object,
            ipAddress: ip ?? undefined,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: { cancelledThreads: updated.count },
      });
    }

    const targets = await prisma.chatThread.findMany({
      where: {
        patientId: patient.id,
        status: { notIn: ["deleted"] },
      },
      select: { id: true },
    });

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "No conversations to schedule for deletion" },
        { status: 400 },
      );
    }

    const when = deletionScheduledAtFromNow();
    await prisma.chatThread.updateMany({
      where: {
        patientId: patient.id,
        status: { notIn: ["deleted"] },
      },
      data: {
        status: "pending_deletion",
        deletionScheduledAt: when,
        slaPatientMessageId: null,
        slaTherapistRemindedAt: null,
        slaAdminNotifiedAt: null,
      },
    });

    for (const t of targets) {
      await prisma.chatAuditLog.create({
        data: {
          id: randomUUID(),
          threadId: t.id,
          actorId: user.id,
          actorRole: "patient",
          action: "chat_deletion_scheduled",
          metadata: { scheduledFor: when.toISOString() } as object,
          ipAddress: ip ?? undefined,
        },
      });
    }

    const dateLabel = new Intl.DateTimeFormat("en-NG", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(when);

    const pf = firstName(patient.fullName);
    const profileUrl = `${appBase()}/dashboard?tab=profile`;

    void sendTransactionalEmail({
      to: patient.email,
      subject: chatDeletionScheduledSubject(dateLabel),
      html: chatDeletionScheduledHtml({
        firstName: pf,
        scheduledDateLabel: `${dateLabel} WAT`,
        profileUrl,
      }),
      text: `Hi ${pf}, your Ealho chat history is scheduled for permanent removal on ${dateLabel} WAT. Cancel from your dashboard profile before then if you change your mind: ${profileUrl}`,
    });

    const wa = normalizeNgDigits(patient.phone ?? null);
    if (wa) {
      void sendWhatsAppText({
        toE164Digits: wa,
        body: `Ealho: You scheduled deletion of all therapy chat messages. They will be removed ${dateLabel} WAT. Open your dashboard → Profile to cancel before then if you need to keep them.`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        scheduledDeletionAt: when.toISOString(),
        threadsAffected: targets.length,
      },
    });
  } catch (e) {
    console.error("chat/delete-all-messages:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
