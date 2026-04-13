import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { appBaseUrl } from "@/lib/app-url";
import {
  partnerStaffInviteHtml,
  partnerStaffInviteSubject,
} from "@/lib/emails/partner-staff-invite";
import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { captureApiError } from "@/lib/sentry/capture";
const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * Resend the partner staff invite email. Refreshes verification code + 48h expiry on the auth user.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { id: partnerId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const emailNorm = parsed.data.email.trim().toLowerCase();

  const partner = await prisma.superReferralPartner.findUnique({
    where: { id: partnerId },
  });
  if (!partner) {
    return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });
  }

  const patient = await prisma.therapyPatient.findFirst({
    where: {
      email: { equals: emailNorm, mode: "insensitive" },
      partnerClient: { superReferralPartnerId: partnerId },
    },
    include: { partnerClient: true },
  });

  if (!patient?.partnerClient) {
    return NextResponse.json(
      {
        success: false,
        error:
          "No staff member with that email for this partner (check CSV import and partner).",
      },
      { status: 404 },
    );
  }

  const uid = patient.partnerClient.userId;
  if (!uid) {
    return NextResponse.json(
      {
        success: false,
        error: "This staff row has no linked login yet; cannot resend invite.",
      },
      { status: 400 },
    );
  }

  const adminSb = createServiceRoleClient();
  const { data: authData, error: getErr } = await adminSb.auth.admin.getUserById(uid);
  if (getErr || !authData.user) {
    return NextResponse.json(
      { success: false, error: "Auth user not found for this staff member." },
      { status: 400 },
    );
  }

  const inviteCode = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const meta = (authData.user.user_metadata ?? {}) as Record<string, unknown>;

  const { error: updErr } = await adminSb.auth.admin.updateUserById(uid, {
    user_metadata: {
      ...meta,
      full_name: patient.fullName,
      invite_code: inviteCode,
      invite_expires: expiresAt.toISOString(),
      needs_password_setup: true,
      partner_slug: partner.referralSlug,
      partner_client_id: patient.partnerClient.id,
    },
  });

  if (updErr) {
    console.error("resend-invite updateUser:", updErr);
    return NextResponse.json(
      { success: false, error: "Could not refresh invite on the account." },
      { status: 500 },
    );
  }

  const base = appBaseUrl() || "https://ealhohq.com";
  const setupLink = `${base.replace(/\/$/, "")}/auth/setup?email=${encodeURIComponent(emailNorm)}&code=${inviteCode}&role=patient&partner=${encodeURIComponent(partner.referralSlug)}`;
  const first = patient.fullName.split(/\s+/)[0] ?? patient.fullName;

  const html = partnerStaffInviteHtml({
    firstName: first,
    partnerName: partner.name,
    partnerLogoUrl: partner.logoUrl,
    inviteCode,
    setupLink,
  });

  const sent = await sendTransactionalEmail({
    to: emailNorm,
    subject: partnerStaffInviteSubject(partner.name),
    html,
  });

  if (!sent.success) {
    return NextResponse.json(
      {
        success: false,
        error: sent.error ?? "Email could not be sent (invite code was still refreshed).",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      email: emailNorm,
      message: "Invite email sent.",
    },
  });
}
