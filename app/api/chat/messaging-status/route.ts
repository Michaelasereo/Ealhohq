import { NextResponse } from "next/server";

import { chatDeletionGraceDays } from "@/lib/chat/deletion-schedule";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
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

    const patient = await ensureRegisteredPatientForUser(user);
    if (!patient) {
      return NextResponse.json({
        success: true,
        data: {
          graceDays: chatDeletionGraceDays(),
          pendingDeletion: false,
          scheduledDeletionAt: null as string | null,
          activeThreadCount: 0,
        },
      });
    }

    const threads = await prisma.chatThread.findMany({
      where: { patientId: patient.id },
      select: { status: true, deletionScheduledAt: true },
    });

    const pending = threads.filter((t) => t.status === "pending_deletion");
    const times = pending
      .map((t) => t.deletionScheduledAt?.getTime())
      .filter((x): x is number => typeof x === "number");
    const earliest =
      times.length > 0 ? new Date(Math.min(...times)) : null;

    const activeThreadCount = threads.filter(
      (t) => t.status !== "deleted",
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        graceDays: chatDeletionGraceDays(),
        pendingDeletion: pending.length > 0,
        scheduledDeletionAt: earliest?.toISOString() ?? null,
        activeThreadCount,
      },
    });
  } catch (e) {
    console.error("chat/messaging-status:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
