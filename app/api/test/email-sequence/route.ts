import { NextResponse } from "next/server";

import { runEmailSequence } from "@/lib/email/sequences/run-email-sequence";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const data = await runEmailSequence();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("test sequence error", error);
    return NextResponse.json({ error: "Sequence job failed" }, { status: 500 });
  }
}
