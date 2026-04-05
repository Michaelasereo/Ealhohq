import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  type: z.enum(["signup", "login", "password_reset"]),
});

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const json = (await req.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const { email: rawEmail, code, type } = parsed.data;
    const email = rawEmail.trim().toLowerCase();

    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    const nowIso = new Date().toISOString();

    const { data: rows, error: selErr } = await supabase
      .from("auth_otp_codes")
      .select("*")
      .eq("email", email)
      .eq("type", type)
      .eq("used", false)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1);

    if (selErr) {
      console.error("verify-otp select:", selErr);
      return NextResponse.json(
        { success: false, error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    const row = rows?.[0];
    if (!row) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    if (row.code === code) {
      const { error: updErr } = await supabase
        .from("auth_otp_codes")
        .update({ used: true })
        .eq("id", row.id);

      if (updErr) {
        console.error("verify-otp mark used:", updErr);
        return NextResponse.json(
          { success: false, error: "Could not verify code" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    const attempts = (row.attempts as number) + 1;

    const { error: attErr } = await supabase
      .from("auth_otp_codes")
      .update({ attempts })
      .eq("id", row.id);

    if (attErr) {
      console.error("verify-otp attempts:", attErr);
      return NextResponse.json(
        { success: false, error: "Invalid or expired code" },
        { status: 400 },
      );
    }

    if (attempts >= MAX_ATTEMPTS) {
      await supabase
        .from("auth_otp_codes")
        .update({ used: true })
        .eq("id", row.id);

      return NextResponse.json(
        { success: false, error: "Too many attempts" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: false,
      error: "Invalid code",
      attemptsLeft: MAX_ATTEMPTS - attempts,
    });
  } catch (e) {
    console.error("verify-otp:", e);
    return NextResponse.json(
      { success: false, error: "Could not verify code" },
      { status: 500 },
    );
  }
}
