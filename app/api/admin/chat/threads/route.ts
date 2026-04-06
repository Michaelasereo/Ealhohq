import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim();
    const therapistId = searchParams.get("therapistId")?.trim();
    const take = Math.min(
      Math.max(1, Number(searchParams.get("limit")) || 40),
      100,
    );

    const allowedStatus = new Set([
      "active",
      "paused",
      "closed",
      "pending_deletion",
      "deleted",
    ]);

    const threads = await prisma.chatThread.findMany({
      where: {
        ...(status && allowedStatus.has(status) ? { status } : {}),
        ...(therapistId
          ? { therapistId }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take,
      select: {
        id: true,
        status: true,
        consentGiven: true,
        consentAt: true,
        updatedAt: true,
        createdAt: true,
        slaTherapistRemindedAt: true,
        slaAdminNotifiedAt: true,
        deletionScheduledAt: true,
        patient: { select: { id: true, fullName: true } },
        therapist: {
          select: {
            id: true,
            profile: { select: { fullName: true } },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            senderRole: true,
            createdAt: true,
            isFlagged: true,
            riskLevel: true,
            isResolved: true,
          },
        },
      },
    });

    const threadIds = threads.map((t) => t.id);
    const openFlagGroups =
      threadIds.length === 0
        ? []
        : await prisma.chatMessage.groupBy({
            by: ["threadId"],
            where: {
              threadId: { in: threadIds },
              isDeleted: false,
              isFlagged: true,
              isResolved: false,
            },
            _count: { id: true },
          });
    const openFlagByThread = new Map(
      openFlagGroups.map((g) => [g.threadId, g._count.id]),
    );

    const withCounts = threads.map((t) => {
      const last = t.messages[0];
      return {
        id: t.id,
        status: t.status,
        consentGiven: t.consentGiven,
        consentAt: t.consentAt?.toISOString() ?? null,
        updatedAt: t.updatedAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
        slaTherapistRemindedAt:
          t.slaTherapistRemindedAt?.toISOString() ?? null,
        slaAdminNotifiedAt: t.slaAdminNotifiedAt?.toISOString() ?? null,
        deletionScheduledAt: t.deletionScheduledAt?.toISOString() ?? null,
        patient: { id: t.patient.id, displayName: t.patient.fullName },
        therapist: {
          id: t.therapist.id,
          displayName: therapistPublicLabel(t.therapist.profile.fullName),
        },
        lastMessage: last
          ? {
              id: last.id,
              senderRole: last.senderRole,
              createdAt: last.createdAt.toISOString(),
              isFlagged: last.isFlagged,
              riskLevel: last.riskLevel,
              isResolved: last.isResolved,
            }
          : null,
        openFlagCount: openFlagByThread.get(t.id) ?? 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: { threads: withCounts },
    });
  } catch (e) {
    console.error("admin/chat/threads:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
