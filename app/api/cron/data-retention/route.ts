import { NextResponse } from "next/server";

import { runDataRetentionCron } from "@/lib/chat/data-retention-cron";

import { captureApiError } from "@/lib/sentry/capture";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDataRetentionCron();
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("cron data-retention:", e);
    captureApiError(e, { route: "/cron/data-retention" });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
