import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    resolutionNote: z.string().max(2000).optional(),
  })
  .strict();

type Ctx = { params: Promise<{ messageId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { messageId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const msg = await prisma.chatMessage.findFirst({
      where: { id: messageId, isFlagged: true, isDeleted: false },
      select: { id: true, threadId: true, isResolved: true },
    });
    if (!msg) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (msg.isResolved) {
      return NextResponse.json({ error: "Already resolved" }, { status: 400 });
    }

    const now = new Date();
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isResolved: true,
        resolvedAt: now,
        resolvedBy: user.id,
        resolutionNote: parsed.data.resolutionNote?.trim() || null,
      },
    });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await prisma.chatAuditLog.create({
      data: {
        id: randomUUID(),
        threadId: msg.threadId,
        actorId: user.id,
        actorRole: "admin",
        action: "flag_resolved",
        metadata: { messageId } as object,
        ipAddress: ip ?? undefined,
      },
    });

    return NextResponse.json({ success: true, data: { id: messageId } });
  } catch (e) {
    console.error("admin/chat/flagged/resolve:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
