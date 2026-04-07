import { NextResponse } from "next/server";
import { z } from "zod";

import { findUserIdByEmail } from "@/lib/auth/find-user-by-email";
import { isTherapistSignupAllowed } from "@/lib/auth/therapist-signup-allowlist";
import { recordConsentRecords } from "@/lib/consents/record-consent-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  flow: z.enum(["signup", "login"]),
  password: z.string().min(6),
  name: z.string().optional().default(""),
  role: z.string().optional().default("patient"),
  phone: z.string().optional().default(""),
  consentTypes: z.array(z.string()).optional(),
});

/** OTP rows use type `signup` for all app flows (send-otp always sends signup). */
const OTP_TYPE = "signup" as const;
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

    const {
      email: rawEmail,
      code,
      flow,
      password,
      name,
      role,
      phone,
      consentTypes,
    } = parsed.data;
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
      .eq("type", OTP_TYPE)
      .eq("used", false)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1);

    if (selErr) {
      console.error("complete-otp select:", selErr);
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

    if (row.code !== code) {
      const attempts = (row.attempts as number) + 1;
      await supabase
        .from("auth_otp_codes")
        .update({ attempts })
        .eq("id", row.id);

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
    }

    if (flow === "signup" && role === "therapist") {
      const gate = await isTherapistSignupAllowed(supabase, email);
      if (!gate.allowed) {
        if (gate.reason === "patient_conflict") {
          return NextResponse.json(
            {
              success: false,
              error:
                "This email is already registered as a client. Use a different email for your therapist account or contact support.",
            },
            { status: 403 },
          );
        }
        return NextResponse.json(
          {
            success: false,
            error:
              "Therapist sign-up is limited to invited emails. If you were invited, use the same email you were given. Otherwise contact us at hello@ealhohq.com.",
          },
          { status: 403 },
        );
      }
    }

    const userMeta: Record<string, string> = {
      full_name: name.trim(),
    };
    if (phone.trim()) {
      userMeta.phone = phone.trim();
    }
    if (role === "therapist") {
      userMeta.role = "therapist";
    }

    const appMeta: Record<string, string> = { role };
    if (role === "therapist") {
      appMeta.status = "pending";
    }

    try {
      if (flow === "login") {
        const userId = await findUserIdByEmail(supabase, email);
        if (!userId) {
          return NextResponse.json(
            { success: false, error: "No account found for this email" },
            { status: 400 },
          );
        }
        const { error: updErr } = await supabase.auth.admin.updateUserById(
          userId,
          {
            email_confirm: true,
          },
        );
        if (updErr) {
          console.error("complete-otp confirm login user:", updErr);
          return NextResponse.json(
            { success: false, error: updErr.message },
            { status: 500 },
          );
        }
      } else {
        const { error: createErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: userMeta,
          app_metadata: appMeta,
        });

        if (createErr) {
          const msg = createErr.message.toLowerCase();
          if (
            msg.includes("registered") ||
            msg.includes("already") ||
            (createErr as { status?: number }).status === 422
          ) {
            const userId = await findUserIdByEmail(supabase, email);
            if (!userId) {
              return NextResponse.json(
                { success: false, error: createErr.message },
                { status: 400 },
              );
            }
            const { data: existing, error: getErr } =
              await supabase.auth.admin.getUserById(userId);
            if (getErr || !existing.user) {
              return NextResponse.json(
                { success: false, error: "Could not load existing user" },
                { status: 500 },
              );
            }
            const prevApp =
              (existing.user.app_metadata as Record<string, unknown> | null) ??
              {};
            const prevUser =
              (existing.user.user_metadata as Record<string, unknown> | null) ??
              {};
            const { error: updErr } = await supabase.auth.admin.updateUserById(
              userId,
              {
                password,
                email_confirm: true,
                user_metadata: { ...prevUser, ...userMeta },
                app_metadata: { ...prevApp, ...appMeta },
              },
            );
            if (updErr) {
              console.error("complete-otp update existing:", updErr);
              return NextResponse.json(
                { success: false, error: updErr.message },
                { status: 500 },
              );
            }
          } else {
            console.error("complete-otp createUser:", createErr);
            return NextResponse.json(
              { success: false, error: createErr.message },
              { status: 500 },
            );
          }
        }
      }
    } catch (e) {
      console.error("complete-otp auth:", e);
      return NextResponse.json(
        { success: false, error: "Could not complete registration" },
        { status: 500 },
      );
    }

    if (flow === "signup" && consentTypes && consentTypes.length > 0) {
      const uid = await findUserIdByEmail(supabase, email);
      if (uid) {
        try {
          await recordConsentRecords({
            userId: uid,
            consentTypes,
            req,
          });
        } catch (consentErr) {
          console.error("complete-otp consent:", consentErr);
        }
      }
    }

    const { error: markErr } = await supabase
      .from("auth_otp_codes")
      .update({ used: true })
      .eq("id", row.id);

    if (markErr) {
      console.error("complete-otp mark otp used:", markErr);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("complete-otp:", e);
    return NextResponse.json(
      { success: false, error: "Could not complete verification" },
      { status: 500 },
    );
  }
}
