import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

import { captureApiError } from "@/lib/sentry/capture";
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
    const unresolvedOnly = searchParams.get("unresolved") === "1";
    const take = Math.min(
      Math.max(1, Number(searchParams.get("limit")) || 80),
      200,
    );

    const rows = await prisma.chatMessage.findMany({
      where: {
        isFlagged: true,
        isDeleted: false,
        ...(unresolvedOnly ? { isResolved: false } : {}),
      },
      orderBy: [{ flaggedAt: "desc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        threadId: true,
        senderRole: true,
        createdAt: true,
        riskLevel: true,
        riskType: true,
        flagReason: true,
        flaggedAt: true,
        isResolved: true,
        resolvedAt: true,
        highRiskEscalatedAt: true,
        thread: {
          select: {
            status: true,
            patient: { select: { fullName: true } },
            therapist: {
              select: { profile: { select: { fullName: true } } },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        messages: rows.map((m) => ({
          id: m.id,
          threadId: m.threadId,
          senderRole: m.senderRole,
          createdAt: m.createdAt.toISOString(),
          riskLevel: m.riskLevel,
          riskType: m.riskType,
          flagReason: m.flagReason,
          flaggedAt: m.flaggedAt?.toISOString() ?? null,
          isResolved: m.isResolved,
          resolvedAt: m.resolvedAt?.toISOString() ?? null,
          highRiskEscalatedAt: m.highRiskEscalatedAt?.toISOString() ?? null,
          threadStatus: m.thread.status,
          patientName: m.thread.patient.fullName,
          therapistName: therapistPublicLabel(
            m.thread.therapist.profile.fullName,
          ),
        })),
      },
    });
  } catch (e) {
    console.error("admin/chat/flagged:", e);
    captureApiError(e, { route: "/admin/chat/flagged" });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
