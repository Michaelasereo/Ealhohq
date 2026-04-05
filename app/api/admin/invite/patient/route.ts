import crypto from "crypto";
import { NextResponse } from "next/server";

import { findAuthUserByEmail } from "@/lib/auth/find-auth-user-by-email";
import { isAdminUser } from "@/lib/auth/is-admin";
import { appBaseUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { prisma } from "@/lib/prisma/client";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { templates } from "@/lib/whatsapp/templates";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      email?: string;
      fullName?: string;
      phone?: string;
      initialCredits?: number;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const initialCredits = Math.max(
      0,
      Math.floor(Number(body.initialCredits ?? 0)),
    );

    if (!email || !fullName) {
      return NextResponse.json(
        { error: "Email and full name are required" },
        { status: 400 },
      );
    }

    const inviteCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const adminSb = createServiceRoleClient();
    const existing = await findAuthUserByEmail(adminSb, email);
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const tempPassword = crypto.randomBytes(16).toString("hex");

    const { data: created, error: createError } =
      await adminSb.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          invite_code: inviteCode,
          invite_expires: expiresAt.toISOString(),
          needs_password_setup: true,
        },
        app_metadata: {
          role: "patient",
          status: "active",
        },
      });

    if (createError || !created.user) {
      console.error("createUser patient:", createError);
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create user" },
        { status: 500 },
      );
    }

    const uid = created.user.id;

    try {
      await prisma.sharedProfile.create({
        data: {
          id: uid,
          role: "patient",
          fullName,
          phone: phone || null,
          status: "active",
        },
      });

      const patient = await prisma.therapyPatient.create({
        data: {
          profileId: uid,
          fullName,
          email,
          phone: phone || "",
        },
      });

      await prisma.therapyCredit.create({
        data: {
          patientId: patient.id,
          balance: initialCredits,
          tier: "bronze",
        },
      });

      if (initialCredits > 0) {
        await prisma.therapyCreditTransaction.create({
          data: {
            patientId: patient.id,
            amount: initialCredits,
            type: "admin_grant",
            reference: "invite",
          },
        });
      }
    } catch (dbErr) {
      console.error("Invite patient DB rollback:", dbErr);
      await adminSb.auth.admin.deleteUser(uid);
      return NextResponse.json(
        { error: "Failed to create patient profile" },
        { status: 500 },
      );
    }

    const base = appBaseUrl() || "https://ealhohq.com";
    const setupLink = `${base.replace(/\/$/, "")}/auth/setup?email=${encodeURIComponent(email)}&code=${inviteCode}&role=patient`;

    const first = fullName.split(/\s+/)[0] ?? fullName;
    const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #292612; margin: 0 0 24px;">ealho</h1>
          <h2 style="font-size: 20px; font-weight: 600; color: #111; margin-bottom: 8px;">
            Your Ealho Therapy account is ready
          </h2>
          <p style="color: #555; line-height: 1.6; margin-bottom: 24px;">
            Hi ${first},
            <br /><br />
            Your therapist has set up an Ealho Therapy account for you.
            Use the code below to complete your account setup and access your session history and upcoming appointments.
          </p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #666; font-size: 14px; margin: 0 0 8px;">Your verification code</p>
            <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #292612; margin: 0;">${inviteCode}</p>
            <p style="color: #999; font-size: 12px; margin: 8px 0 0;">Expires in 48 hours</p>
          </div>
          <a href="${setupLink}"
             style="display: block; background: #292612; color: #d6eae1; text-align: center; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">
            Complete setup →
          </a>
          <p style="color: #999; font-size: 12px; text-align: center;">${setupLink}</p>
        </div>`;

    const sent = await sendTransactionalEmail({
      to: email,
      subject: "Your Ealho Therapy account is ready",
      html,
    });
    if (!sent.success) {
      console.error("Invite patient email:", sent.error);
      return NextResponse.json(
        { error: "Patient created but email failed to send" },
        { status: 502 },
      );
    }

    if (phone) {
      const setupLink = `${base.replace(/\/$/, "")}/auth/setup?email=${encodeURIComponent(email)}&code=${inviteCode}&role=patient`;
      void sendWhatsApp({
        to: phone,
        body: templates.inviteSetup({
          name: fullName,
          code: inviteCode,
          setupLink,
          role: "patient",
        }),
      }).catch((err) => console.error("Invite patient WhatsApp:", err));
    }

    return NextResponse.json({
      success: true,
      data: { message: "Invite sent successfully", email },
    });
  } catch (error) {
    console.error("Invite patient error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
