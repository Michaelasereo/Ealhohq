import { NextResponse } from "next/server";

import { runEmailSequence } from "@/lib/email/sequences/run-email-sequence";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await runEmailSequence();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Sequence cron error:", error);
    return NextResponse.json({ error: "Sequence job failed" }, { status: 500 });
  }
}
