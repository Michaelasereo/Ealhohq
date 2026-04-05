import { NextResponse } from "next/server";

import { sendTransactionalEmail } from "@/lib/reminders/send-email";

/** Hardcoded recipient for local Resend smoke tests only. */
const TEST_EMAIL_TO = "michaelasereo@gmail.com";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await sendTransactionalEmail({
    to: TEST_EMAIL_TO,
    subject: "Ealho Therapy — Resend test",
    html: `<p style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#24221e;">
      This is a test email from the Ealho Therapy development server (<code>/api/test/email</code>).
    </p>`,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    messageId: result.messageId,
  });
}
