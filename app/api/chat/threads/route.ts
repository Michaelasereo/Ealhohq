import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAppRole } from "@/lib/auth/resolve-app-role";
import { decryptMessage } from "@/lib/chat/encryption";
import { patientHasFullChatConsent } from "@/lib/chat/consent";
import {
  ensureRegisteredPatientForUser,
  getTherapistByProfileId,
} from "@/lib/queries/patient";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

export const runtime = "nodejs";

async function logAudit(input: {
  threadId: string;
  actorId: string;
  actorRole: string;
  action: string;
  metadata?: unknown;
  ip: string | null;
}) {
  await prisma.chatAuditLog.create({
    data: {
      id: randomUUID(),
      threadId: input.threadId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      metadata:
        input.metadata === undefined
          ? undefined
          : (input.metadata as object),
      ipAddress: input.ip ?? undefined,
    },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await resolveAppRole(user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role === "patient") {
      const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
      if (!patient) {
        return NextResponse.json({ success: true, data: { threads: [] } });
      }

      const threads = await prisma.chatThread.findMany({
        where: { patientId: patient.id, status: { not: "deleted" } },
        include: {
          therapist: { include: { profile: true } },
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const data = await Promise.all(
        threads.map(async (t) => {
          let lastPreview = "";
          const last = t.messages[0];
          if (last) {
            try {
              lastPreview = (await decryptMessage(last.content, last.contentIv))
                .slice(0, 50);
            } catch {
              lastPreview = "";
            }
          }
          const unreadCount = await prisma.chatMessage.count({
            where: {
              threadId: t.id,
              isRead: false,
              isDeleted: false,
              senderId: { not: user.id },
            },
          });
          return {
            id: t.id,
            status: t.status,
            otherPartyName: therapistPublicLabel(t.therapist.profile.fullName),
            otherPartyPhoto:
              t.therapist.profilePhoto ?? "/Ealho-logo.png",
            lastMessagePreview: lastPreview,
            lastMessageAt: last?.createdAt.toISOString() ?? null,
            unreadCount,
          };
        }),
      );

      return NextResponse.json({ success: true, data: { threads: data } });
    }

    if (role === "therapist") {
      const therapist = await getTherapistByProfileId(user.id);
      if (!therapist) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const threads = await prisma.chatThread.findMany({
        where: { therapistId: therapist.id, status: { not: "deleted" } },
        include: {
          patient: true,
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const data = await Promise.all(
        threads.map(async (t) => {
          let lastPreview = "";
          const last = t.messages[0];
          if (last) {
            try {
              lastPreview = (await decryptMessage(last.content, last.contentIv))
                .slice(0, 50);
            } catch {
              lastPreview = "";
            }
          }
          const unreadCount = await prisma.chatMessage.count({
            where: {
              threadId: t.id,
              isRead: false,
              isDeleted: false,
              senderId: { not: user.id },
            },
          });
          return {
            id: t.id,
            status: t.status,
            otherPartyName: t.patient.fullName,
            otherPartyPhoto: "/Ealho-logo.png",
            lastMessagePreview: lastPreview,
            lastMessageAt: last?.createdAt.toISOString() ?? null,
            unreadCount,
          };
        }),
      );

      return NextResponse.json({ success: true, data: { threads: data } });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (e) {
    console.error("chat/threads GET:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const patientPost = z.object({ therapistId: z.string().uuid() }).strict();
const therapistPost = z.object({ patientId: z.string().uuid() }).strict();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await resolveAppRole(user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    if (role === "patient") {
      const raw = await req.json();
      const parsed = patientPost.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
      }
      const { therapistId } = parsed.data;

      const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
      if (!patient) {
        return NextResponse.json({ error: "Client profile required" }, { status: 403 });
      }

      const okConsent = await patientHasFullChatConsent(patient.id);
      if (!okConsent) {
        return NextResponse.json(
          { error: "Consent required", needsConsent: true },
          { status: 403 },
        );
      }

      const booking = await prisma.therapyBooking.findFirst({
        where: {
          patientId: patient.id,
          therapistId,
          status: { in: ["confirmed", "completed"] },
        },
        select: { id: true },
      });
      if (!booking) {
        return NextResponse.json(
          { error: "No booking with this therapist" },
          { status: 403 },
        );
      }

      const existing = await prisma.chatThread.findUnique({
        where: {
          patientId_therapistId: { patientId: patient.id, therapistId },
        },
      });
      if (existing?.status === "deleted") {
        return NextResponse.json(
          { error: "This conversation has been permanently removed." },
          { status: 400 },
        );
      }

      const thread = await prisma.chatThread.upsert({
        where: {
          patientId_therapistId: { patientId: patient.id, therapistId },
        },
        create: {
          patientId: patient.id,
          therapistId,
          status: "active",
          consentGiven: true,
          consentAt: new Date(),
        },
        update: {},
      });

      if (!existing) {
        await logAudit({
          threadId: thread.id,
          actorId: user.id,
          actorRole: "patient",
          action: "thread_opened",
          ip,
        });
      }

      return NextResponse.json({
        success: true,
        data: { threadId: thread.id, status: thread.status },
      });
    }

    if (role === "therapist") {
      const raw = await req.json();
      const parsed = therapistPost.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
      }
      const { patientId } = parsed.data;

      const therapist = await getTherapistByProfileId(user.id);
      if (!therapist) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const okConsent = await patientHasFullChatConsent(patientId);
      if (!okConsent) {
        return NextResponse.json(
          { error: "Client has not completed messaging consent" },
          { status: 403 },
        );
      }

      const booking = await prisma.therapyBooking.findFirst({
        where: {
          patientId,
          therapistId: therapist.id,
          status: { in: ["confirmed", "completed"] },
        },
        select: { id: true },
      });
      if (!booking) {
        return NextResponse.json(
          { error: "No booking with this patient" },
          { status: 403 },
        );
      }

      const existing = await prisma.chatThread.findUnique({
        where: {
          patientId_therapistId: { patientId, therapistId: therapist.id },
        },
      });
      if (existing?.status === "deleted") {
        return NextResponse.json(
          { error: "This conversation has been permanently removed." },
          { status: 400 },
        );
      }

      const thread = await prisma.chatThread.upsert({
        where: {
          patientId_therapistId: { patientId, therapistId: therapist.id },
        },
        create: {
          patientId,
          therapistId: therapist.id,
          status: "active",
          consentGiven: true,
          consentAt: new Date(),
        },
        update: {},
      });

      if (!existing) {
        await logAudit({
          threadId: thread.id,
          actorId: user.id,
          actorRole: "therapist",
          action: "thread_opened",
          ip,
        });
      }

      return NextResponse.json({
        success: true,
        data: { threadId: thread.id, status: thread.status },
      });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (e) {
    console.error("chat/threads POST:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
