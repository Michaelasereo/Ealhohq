import { NextResponse } from "next/server";

import { sendSessionReminders } from "@/lib/email/send-session-reminders";

import { captureApiError } from "@/lib/sentry/capture";
// Called by cron-job.org every 30 minutes (or Netlify scheduled function).
// Safe to run frequently — only sends when sessions are in 24h or 6h window.

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendSessionReminders();
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reminder cron error:", error);
    captureApiError(error, { route: "/cron/session-reminders" });
    return NextResponse.json(
      { error: "Reminder job failed" },
      { status: 500 },
    );
  }
}
