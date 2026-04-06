import { NextResponse } from "next/server";

import { sendSessionReminders } from "@/lib/email/send-session-reminders";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  const result = await sendSessionReminders();
  return NextResponse.json({ success: true, data: result });
}
