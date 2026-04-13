import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { findSlaBreachThreads } from "@/lib/chat/admin-sla-cron";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { watDayStart, watTodayDateString } from "@/lib/wat-datetime";

import { captureApiError } from "@/lib/sentry/capture";
export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayYmd = watTodayDateString();
    const dayStart = watDayStart(todayYmd);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalActiveThreads,
      totalMessagesToday,
      flaggedHigh,
      flaggedMedium,
      flaggedLow,
      slaList,
      avgRow,
      therapistWeekRows,
    ] = await Promise.all([
      prisma.chatThread.count({
        where: { status: { in: ["active", "paused"] } },
      }),
      prisma.chatMessage.count({
        where: { createdAt: { gte: dayStart }, isDeleted: false },
      }),
      prisma.chatMessage.count({
        where: {
          isFlagged: true,
          riskLevel: "high",
          isDeleted: false,
          isResolved: false,
        },
      }),
      prisma.chatMessage.count({
        where: {
          isFlagged: true,
          riskLevel: "medium",
          isDeleted: false,
          isResolved: false,
        },
      }),
      prisma.chatMessage.count({
        where: {
          isFlagged: true,
          riskLevel: "low",
          isDeleted: false,
          isResolved: false,
        },
      }),
      findSlaBreachThreads(24),
      prisma.$queryRaw<{ avg_h: number | null }[]>`
        SELECT AVG(
          EXTRACT(EPOCH FROM (tr.reply_at - pm."createdAt")) / 3600.0
        )::float AS avg_h
        FROM "chat_messages" pm
        INNER JOIN LATERAL (
          SELECT MIN(cm."createdAt") AS reply_at
          FROM "chat_messages" cm
          WHERE cm."threadId" = pm."threadId"
            AND cm."senderRole" = 'therapist'
            AND cm."createdAt" > pm."createdAt"
            AND cm."isDeleted" = false
        ) tr ON true
        WHERE pm."senderRole" = 'patient'
          AND pm."isDeleted" = false
          AND pm."createdAt" >= ${weekAgo}
      `,
      prisma.$queryRaw<{ therapistId: string; cnt: bigint }[]>`
        SELECT t."therapistId", COUNT(*)::bigint AS cnt
        FROM "chat_messages" m
        INNER JOIN "chat_threads" t ON t.id = m."threadId"
        WHERE m."senderRole" = 'therapist'
          AND m."isDeleted" = false
          AND m."createdAt" >= ${weekAgo}
        GROUP BY t."therapistId"
      `,
    ]);

    const breachByTherapist = new Map<string, number>();
    for (const b of slaList) {
      breachByTherapist.set(
        b.therapistId,
        (breachByTherapist.get(b.therapistId) ?? 0) + 1,
      );
    }

    const therapistIdSet = new Set<string>([
      ...therapistWeekRows.map((r) => r.therapistId),
      ...breachByTherapist.keys(),
    ]);
    const therapistIdList = Array.from(therapistIdSet);

    const therapists =
      therapistIdList.length === 0
        ? []
        : await prisma.therapyTherapist.findMany({
            where: { id: { in: therapistIdList } },
            select: {
              id: true,
              profile: { select: { fullName: true } },
            },
          });
    const nameById = new Map(
      therapists.map((t) => [t.id, therapistPublicLabel(t.profile.fullName)]),
    );

    const therapistResponseStats = therapistIdList.map((therapistId) => ({
      therapistId,
      therapistName: nameById.get(therapistId) ?? "Unknown",
      unansweredCount: breachByTherapist.get(therapistId) ?? 0,
      totalMessagesThisWeek: Number(
        therapistWeekRows.find((r) => r.therapistId === therapistId)?.cnt ??
          BigInt(0),
      ),
    }));

    const avgH = avgRow[0]?.avg_h;
    const avgResponseTimeHours =
      typeof avgH === "number" && Number.isFinite(avgH) ? avgH : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalActiveThreads,
        totalMessagesToday,
        flaggedMessages: {
          high: flaggedHigh,
          medium: flaggedMedium,
          low: flaggedLow,
        },
        slaBreaches: slaList.length,
        avgResponseTimeHours,
        therapistResponseStats,
      },
    });
  } catch (e) {
    console.error("admin/chat/overview:", e);
    captureApiError(e, { route: "/admin/chat/overview" });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
