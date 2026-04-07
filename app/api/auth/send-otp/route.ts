import { NextResponse } from "next/server";
import { z } from "zod";

import { isTherapistSignupAllowed } from "@/lib/auth/therapist-signup-allowlist";
import { buildOTPEmail } from "@/lib/emails/otp-verification";
import { generateOTP, getOTPExpiry } from "@/lib/otp/generate";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200).optional().default(""),
  type: z.enum(["signup", "login", "password_reset"]),
  /** When `type` is `signup`, use `therapist` for therapist enrollment; default `patient`. */
  signupRole: z.enum(["patient", "therapist"]).optional(),
});

const OTP_EXPIRY_MINUTES = 10;

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

    const { email: rawEmail, name, type, signupRole } = parsed.data;
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

    if (type === "signup" && signupRole === "therapist") {
      const gate = await isTherapistSignupAllowed(supabase, email);
      if (!gate.allowed) {
        if (gate.reason === "patient_conflict") {
          return NextResponse.json(
            {
              success: false,
              error:
                "This email is already registered as a client. Use a different email for your therapist account.",
            },
            { status: 403 },
          );
        }
        return NextResponse.json(
          {
            success: false,
            error:
              "Therapist sign-up is limited to invited emails. Contact us at hello@ealhohq.com if you need access.",
          },
          { status: 403 },
        );
      }
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabase
      .from("auth_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", tenMinutesAgo);

    if (countErr) {
      console.error("send-otp count:", countErr);
      return NextResponse.json(
        { success: false, error: "Could not send code" },
        { status: 500 },
      );
    }

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many requests. Please wait before requesting another code.",
        },
        { status: 429 },
      );
    }

    const { error: invErr } = await supabase
      .from("auth_otp_codes")
      .update({ used: true })
      .eq("email", email)
      .eq("type", type)
      .eq("used", false);

    if (invErr) {
      console.error("send-otp invalidate:", invErr);
      return NextResponse.json(
        { success: false, error: "Could not send code" },
        { status: 500 },
      );
    }

    const code = generateOTP();
    const expiresAt = getOTPExpiry();

    const { error: insErr } = await supabase.from("auth_otp_codes").insert({
      email,
      code,
      type,
      expires_at: expiresAt.toISOString(),
      used: false,
      attempts: 0,
    });

    if (insErr) {
      console.error("send-otp insert:", insErr);
      return NextResponse.json(
        { success: false, error: "Could not send code" },
        { status: 500 },
      );
    }

    const displayName = name.trim() || email.split("@")[0] || "there";
    const { subject, html, text } = buildOTPEmail({
      recipientEmail: email,
      recipientName: displayName,
      otpCode: code,
      type,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    const sent = await sendTransactionalEmail({
      to: email,
      subject,
      html,
      text,
    });

    if (!sent.success) {
      return NextResponse.json(
        { success: false, error: sent.error ?? "Email failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    console.error("send-otp:", e);
    return NextResponse.json(
      { success: false, error: "Could not send code" },
      { status: 500 },
    );
  }
}
