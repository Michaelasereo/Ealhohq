import crypto, { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { findAuthUserByEmail } from "@/lib/auth/find-auth-user-by-email";
import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { appBaseUrl } from "@/lib/app-url";
import { emailMarkLogoImg, escapeHtml } from "@/lib/emails/partials";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { templates } from "@/lib/whatsapp/templates";
import { prisma } from "@/lib/prisma/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { captureApiError } from "@/lib/sentry/capture";
const createBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  mdcnRegistrationNumber: z.string().min(1),
  specialisation: z.string().min(1),
  sessionRate: z.number().positive(),
  pharmacyPartnerId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  try {
    const rows = await prisma.psychiatrist.findMany({
      orderBy: { name: "asc" },
      include: {
        pharmacyPartner: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({
      success: true,
      data: rows.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        mdcnRegistrationNumber: p.mdcnRegistrationNumber,
        specialisation: p.specialisation,
        sessionRate: Number(p.sessionRate),
        pharmacyPartnerId: p.pharmacyPartnerId,
        pharmacyPartnerName: p.pharmacyPartner?.name ?? null,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("admin/psychiatrists GET:", e);
    captureApiError(e, { route: "/admin/psychiatrists" });
    return NextResponse.json(
      { success: false, error: "Failed to load psychiatrists" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const pharmacyId = parsed.data.pharmacyPartnerId ?? null;
  if (pharmacyId) {
    const exists = await prisma.pharmacyPartner.findUnique({
      where: { id: pharmacyId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "Pharmacy partner not found" },
        { status: 400 },
      );
    }
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    let adminSb;
    try {
      adminSb = createServiceRoleClient();
    } catch {
      adminSb = null;
    }

    if (adminSb) {
      const existingAuth = await findAuthUserByEmail(adminSb, email);
      if (existingAuth) {
        return NextResponse.json(
          { success: false, error: "An account with this email already exists" },
          { status: 409 },
        );
      }

      const inviteCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const tempPassword = crypto.randomBytes(16).toString("hex");

      const { data: created, error: createErr } =
        await adminSb.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: parsed.data.name.trim(),
            invite_code: inviteCode,
            invite_expires: expiresAt.toISOString(),
            needs_password_setup: true,
          },
          app_metadata: { role: "psychiatrist" },
        });

      if (createErr || !created.user) {
        console.error("psychiatrist createUser:", createErr);
        return NextResponse.json(
          { success: false, error: createErr?.message ?? "Auth create failed" },
          { status: 500 },
        );
      }

      const uid = created.user.id;

      try {
        const row = await prisma.$transaction(async (tx) => {
          await tx.sharedProfile.create({
            data: {
              id: uid,
              role: "psychiatrist",
              fullName: parsed.data.name.trim(),
              phone: parsed.data.phone.trim(),
              status: "active",
            },
          });
          return tx.psychiatrist.create({
            data: {
              id: randomUUID(),
              name: parsed.data.name.trim(),
              email,
              phone: parsed.data.phone.trim(),
              mdcnRegistrationNumber: parsed.data.mdcnRegistrationNumber.trim(),
              specialisation: parsed.data.specialisation.trim(),
              sessionRate: parsed.data.sessionRate,
              pharmacyPartnerId: pharmacyId,
              profileId: uid,
            },
          });
        });

        const base = appBaseUrl() || "https://ealho.com";
        const setupLink = `${base.replace(/\/$/, "")}/auth/setup?email=${encodeURIComponent(email)}&code=${inviteCode}&role=psychiatrist`;
        const firstName = parsed.data.name.trim().split(/\s+/)[0] ?? parsed.data.name.trim();

        const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          ${emailMarkLogoImg({ maxHeightPx: 44, align: "left" })}
          <h2 style="font-size: 20px; font-weight: 600; color: #111; margin: 24px 0 8px;">
            Welcome to Ealho Therapy, Dr ${escapeHtml(firstName)}
          </h2>
          <p style="color: #555; margin-bottom: 16px; line-height: 1.6;">
            You&apos;ve been invited to join Ealho Therapy as a consulting psychiatrist.
            Use the verification code below to set up your account and choose a secure password.
          </p>
          <p style="color: #555; margin-bottom: 24px; line-height: 1.6; font-size: 14px;">
            Your MDCN registration number <strong>${escapeHtml(parsed.data.mdcnRegistrationNumber.trim())}</strong>
            has been recorded. Please ensure your registration remains current.
          </p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <p style="color: #666; font-size: 14px; margin: 0 0 8px;">Your verification code</p>
            <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #292612; margin: 0;">${inviteCode}</p>
            <p style="color: #999; font-size: 12px; margin: 8px 0 0;">Expires in 48 hours</p>
          </div>
          <a href="${setupLink}"
             style="display: block; background: #292612; color: #d6eae1; text-align: center; padding: 14px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin-bottom: 16px;">
            Set Up My Account →
          </a>
          <p style="color: #999; font-size: 12px; text-align: center;">Or copy this link: ${setupLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #bbb; font-size: 12px; text-align: center;">
            Ealho Therapy. If you didn&apos;t expect this email, please ignore it.
          </p>
        </div>`;

        const sent = await sendTransactionalEmail({
          to: email,
          subject: "You've been invited to join Ealho Therapy — Psychiatry",
          html,
        });
        if (!sent.success) {
          console.error("Invite psychiatrist email:", sent.error);
          captureApiError(sent.error ?? new Error("invite email failed"), {
            route: "/admin/psychiatrists",
          });
        }

        if (parsed.data.phone) {
          void sendWhatsApp({
            to: parsed.data.phone.trim(),
            body: templates.inviteSetup({
              name: parsed.data.name.trim(),
              code: inviteCode,
              setupLink,
              role: "psychiatrist",
            }),
          }).catch((err) => console.error("Invite psychiatrist WhatsApp:", err));
        }

        return NextResponse.json({
          success: true,
          data: {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            mdcnRegistrationNumber: row.mdcnRegistrationNumber,
            specialisation: row.specialisation,
            sessionRate: Number(row.sessionRate),
            pharmacyPartnerId: row.pharmacyPartnerId,
            isActive: row.isActive,
            profileProvisioned: true,
          },
        });
      } catch (e) {
        await adminSb.auth.admin.deleteUser(uid);
        throw e;
      }
    }

    const row = await prisma.psychiatrist.create({
      data: {
        id: randomUUID(),
        name: parsed.data.name.trim(),
        email,
        phone: parsed.data.phone.trim(),
        mdcnRegistrationNumber: parsed.data.mdcnRegistrationNumber.trim(),
        specialisation: parsed.data.specialisation.trim(),
        sessionRate: parsed.data.sessionRate,
        pharmacyPartnerId: pharmacyId,
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        mdcnRegistrationNumber: row.mdcnRegistrationNumber,
        specialisation: row.specialisation,
        sessionRate: Number(row.sessionRate),
        pharmacyPartnerId: row.pharmacyPartnerId,
        isActive: row.isActive,
        profileProvisioned: false,
      },
    });
  } catch (e) {
    console.error("admin/psychiatrists POST:", e);
    captureApiError(e, { route: "/admin/psychiatrists" });
    return NextResponse.json(
      { success: false, error: "Could not create psychiatrist" },
      { status: 500 },
    );
  }
}
