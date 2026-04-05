import { NextResponse } from "next/server";

import { findAuthUserByEmail } from "@/lib/auth/find-auth-user-by-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      code?: string;
      password?: string;
    };
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: "Email, code, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8 || !/\d/.test(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters and contain a number" },
        { status: 400 },
      );
    }

    const adminSb = createServiceRoleClient();
    const user = await findAuthUserByEmail(adminSb, email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (String(meta.invite_code ?? "") !== code) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    const expiresAt = meta.invite_expires;
    if (expiresAt && new Date(String(expiresAt)) < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400 },
      );
    }

    const nextMeta = { ...meta };
    delete nextMeta.invite_code;
    delete nextMeta.invite_expires;
    nextMeta.needs_password_setup = false;

    const { error: updErr } = await adminSb.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: nextMeta,
    });

    if (updErr) {
      console.error("setup-password updateUser:", updErr);
      return NextResponse.json(
        { error: updErr.message ?? "Password setup failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("setup-password:", error);
    return NextResponse.json(
      { error: "Password setup failed" },
      { status: 500 },
    );
  }
}
