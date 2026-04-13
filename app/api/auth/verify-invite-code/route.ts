import { NextResponse } from "next/server";

import { findAuthUserByEmail } from "@/lib/auth/find-auth-user-by-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { captureApiError } from "@/lib/sentry/capture";
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; code?: string };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 },
      );
    }

    const adminSb = createServiceRoleClient();
    const user = await findAuthUserByEmail(adminSb, email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const storedCode = meta?.invite_code;
    const expiresAt = meta?.invite_expires;

    if (!storedCode || String(storedCode) !== code) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    if (expiresAt && new Date(String(expiresAt)) < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: { valid: true } });
  } catch (error) {
    console.error("verify-invite-code:", error);
    captureApiError(error, { route: "/auth/verify-invite-code" });
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 },
    );
  }
}
