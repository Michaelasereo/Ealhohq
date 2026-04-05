import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { findSlaBreachThreads } from "@/lib/chat/admin-sla-cron";
import { createClient } from "@/lib/supabase/server";

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
    const hours = Math.min(
      Math.max(1, Number(searchParams.get("hours")) || 24),
      168,
    );

    const breaches = await findSlaBreachThreads(hours);

    return NextResponse.json({
      success: true,
      data: {
        hoursThreshold: hours,
        breaches: breaches.map((b) => ({
          threadId: b.threadId,
          therapistId: b.therapistId,
          patientFirstName: b.patientFirstName,
          therapistName: b.therapistName,
          lastPatientMessageAt: b.lastPatientMessageAt.toISOString(),
          hoursWithoutReply: b.hoursWithoutReply,
          totalUnansweredMessages: b.totalUnansweredMessages,
        })),
      },
    });
  } catch (e) {
    console.error("admin/chat/sla:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
