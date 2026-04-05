import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { encryptMessage, decryptMessage } from "@/lib/chat/encryption";
import { notifyNewChatMessage } from "@/lib/chat/message-notify";
import { getTherapistByProfileId } from "@/lib/queries/patient";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ threadId: string }> };

async function getThreadForUser(threadId: string, userId: string, role: string) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: {
      patient: true,
      therapist: { include: { profile: true } },
    },
  });
  if (!thread) return null;
  if (role === "patient" && thread.patient.profileId === userId) return thread;
  if (role === "therapist" && thread.therapist.profileId === userId) {
    return thread;
  }
  return null;
}

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

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { threadId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role as string | undefined;
    if (role !== "patient" && role !== "therapist") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thread = await getThreadForUser(threadId, user.id, role);
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (thread.status === "deleted") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(
      Math.max(1, Number(searchParams.get("limit")) || 50),
      100,
    );
    const before = searchParams.get("before");
    const after = searchParams.get("after");

    if (after) {
      const anchor = await prisma.chatMessage.findFirst({
        where: { id: after, threadId, isDeleted: false },
      });
      const rows = anchor
        ? await prisma.chatMessage.findMany({
            where: {
              threadId,
              isDeleted: false,
              OR: [
                { id: after },
                { createdAt: { gt: anchor.createdAt } },
              ],
            },
            orderBy: { createdAt: "asc" },
            take: limit,
          })
        : [];

      const messages = await Promise.all(
        rows.map(async (m) => {
          let content = "";
          try {
            content = await decryptMessage(m.content, m.contentIv);
          } catch {
            content = "";
          }
          return {
            id: m.id,
            content,
            senderId: m.senderId,
            senderRole: m.senderRole,
            createdAt: m.createdAt.toISOString(),
            isRead: m.isRead,
          };
        }),
      );

      return NextResponse.json({
        success: true,
        data: { messages, nextCursor: null as string | null },
      });
    }

    let createdBefore: Date | undefined;
    if (before) {
      const pivot = await prisma.chatMessage.findFirst({
        where: { id: before, threadId, isDeleted: false },
        select: { createdAt: true },
      });
      if (pivot) createdBefore = pivot.createdAt;
    }

    const rows = await prisma.chatMessage.findMany({
      where: {
        threadId,
        isDeleted: false,
        ...(createdBefore ? { createdAt: { lt: createdBefore } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    await prisma.chatMessage.updateMany({
      where: {
        threadId,
        isRead: false,
        senderId: { not: user.id },
        id: { in: rows.map((r) => r.id) },
      },
      data: { isRead: true, readAt: new Date() },
    });

    await logAudit({
      threadId,
      actorId: user.id,
      actorRole: role,
      action: "messages_read",
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    const messages = await Promise.all(
      rows.map(async (m) => {
        let content = "";
        try {
          content = await decryptMessage(m.content, m.contentIv);
        } catch {
          content = "";
        }
        const read =
          m.senderId === user.id
            ? m.isRead
            : true;
        return {
          id: m.id,
          content,
          senderId: m.senderId,
          senderRole: m.senderRole,
          createdAt: m.createdAt.toISOString(),
          isRead: m.senderId === user.id ? m.isRead : true,
        };
      }),
    );

    const oldest = rows[rows.length - 1];
    const nextCursor = oldest && rows.length === limit ? oldest.id : null;

    return NextResponse.json({
      success: true,
      data: { messages, nextCursor },
    });
  } catch (e) {
    console.error("chat messages GET:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const postBody = z.object({ content: z.string().min(1).max(2000) }).strict();

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { threadId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role as string | undefined;
    if (role !== "patient" && role !== "therapist") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thread = await getThreadForUser(threadId, user.id, role);
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (thread.status === "pending_deletion") {
      return NextResponse.json(
        {
          error:
            "Messaging is paused while chat deletion is scheduled. Open Profile to cancel if you need to send messages.",
        },
        { status: 400 },
      );
    }
    if (thread.status !== "active") {
      return NextResponse.json(
        { error: "Thread is not active" },
        { status: 400 },
      );
    }

    const raw = await req.json();
    const parsed = postBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const { content } = parsed.data;
    const { encrypted, iv } = await encryptMessage(content);

    const msg = await prisma.chatMessage.create({
      data: {
        id: randomUUID(),
        threadId,
        senderId: user.id,
        senderRole: role,
        content: encrypted,
        contentIv: iv,
      },
    });

    await prisma.chatThread.update({
      where: { id: threadId },
      data: {
        updatedAt: new Date(),
        ...(role === "therapist"
          ? {
              slaPatientMessageId: null,
              slaTherapistRemindedAt: null,
              slaAdminNotifiedAt: null,
            }
          : {}),
      },
    });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await logAudit({
      threadId,
      actorId: user.id,
      actorRole: role,
      action: "message_sent",
      metadata: { messageId: msg.id },
      ip,
    });

    void import("@/lib/chat/risk-scanner").then(({ scanMessageForRisk }) =>
      scanMessageForRisk(msg.id, content).catch((err) =>
        console.error("risk scan:", err),
      ),
    );

    if (role === "patient") {
      await notifyNewChatMessage({
        toTherapist: true,
        recipientPhone: thread.therapist.profile.phone,
        otherPartyFullName: thread.patient.fullName,
        threadId,
      });
    } else {
      await notifyNewChatMessage({
        toTherapist: false,
        recipientPhone: thread.patient.phone,
        otherPartyFullName: thread.therapist.profile.fullName,
        threadId,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: msg.id,
          content,
          senderId: msg.senderId,
          senderRole: msg.senderRole,
          createdAt: msg.createdAt.toISOString(),
          isRead: msg.isRead,
        },
      },
    });
  } catch (e) {
    console.error("chat messages POST:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
