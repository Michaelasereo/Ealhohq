import { NextResponse } from "next/server";

import { resolveAppRole } from "@/lib/auth/resolve-app-role";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

import { captureApiError } from "@/lib/sentry/capture";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ threadId: string }> };

async function assertParticipant(
  threadId: string,
  userId: string,
  role: string,
) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    include: { patient: true, therapist: true },
  });
  if (!thread) return null;
  if (role === "patient" && thread.patient.profileId === userId) return thread;
  if (role === "therapist" && thread.therapist.profileId === userId) {
    return thread;
  }
  return null;
}

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { threadId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await resolveAppRole(user.id);
    if (role !== "patient" && role !== "therapist") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const thread = await assertParticipant(threadId, user.id, role);
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date();
    const res = await prisma.chatMessage.updateMany({
      where: {
        threadId,
        isRead: false,
        senderId: { not: user.id },
        isDeleted: false,
      },
      data: { isRead: true, readAt: now },
    });

    return NextResponse.json({
      success: true,
      data: { updated: res.count },
    });
  } catch (e) {
    console.error("chat read POST:", e);
    captureApiError(e, { route: "/chat/threads/[threadId]/read" });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
