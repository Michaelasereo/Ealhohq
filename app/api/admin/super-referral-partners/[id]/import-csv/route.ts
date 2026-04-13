import crypto from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { findAuthUserByEmail } from "@/lib/auth/find-auth-user-by-email";
import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { appBaseUrl } from "@/lib/app-url";
import {
  parseStaffCsv,
  rowToStaffRecord,
} from "@/lib/csv/parse-staff-rows";
import {
  partnerStaffInviteHtml,
  partnerStaffInviteSubject,
} from "@/lib/emails/partner-staff-invite";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { prisma } from "@/lib/prisma/client";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";

import { captureApiError } from "@/lib/sentry/capture";
const bodySchema = z.object({
  csvText: z.string().min(1),
  clientType: z.enum(["clinician", "non_clinician"]),
  sendInvites: z.boolean().optional().default(true),
});

const MAX_CSV_BYTES = 10 * 1024 * 1024; // 10 MB

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Safe message for CSV import errors (never leak Prisma/Turbopack internals to admins). */
function importRowErrorMessage(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return "This row conflicts with existing data (duplicate).";
    }
    if (e.code === "P2003") {
      return "Database reference error for this row.";
    }
  }
  if (process.env.NODE_ENV === "development" && e instanceof Error) {
    return e.message.split("\n")[0]?.slice(0, 200) ?? "Import failed";
  }
  return "Import failed for this row.";
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { id: partnerId } = await ctx.params;

  const partner = await prisma.superReferralPartner.findUnique({
    where: { id: partnerId },
  });
  if (!partner) {
    return NextResponse.json({ success: false, error: "Partner not found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let csvText: string;
  let clientType: "clinician" | "non_clinician";
  let sendInvites: boolean;

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid multipart body" },
        { status: 400 },
      );
    }
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Upload a CSV file using the "file" field.' },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ success: false, error: "CSV file is empty" }, { status: 400 });
    }
    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json(
        { success: false, error: `CSV file is too large (max ${MAX_CSV_BYTES / 1024 / 1024} MB)` },
        { status: 400 },
      );
    }
    csvText = await file.text();
    const ctRaw = form.get("clientType");
    if (ctRaw !== "clinician" && ctRaw !== "non_clinician") {
      return NextResponse.json(
        { success: false, error: "clientType must be clinician or non_clinician" },
        { status: 400 },
      );
    }
    clientType = ctRaw;
    const siRaw = form.get("sendInvites");
    sendInvites = siRaw !== "false" && siRaw !== "0";
  } else {
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

    csvText = parsed.data.csvText;
    clientType = parsed.data.clientType;
    sendInvites = parsed.data.sendInvites ?? true;
  }

  if (!csvText.trim()) {
    return NextResponse.json({ success: false, error: "CSV content is empty" }, { status: 400 });
  }
  const { headers, rows: rawRows } = parseStaffCsv(csvText);
  if (headers.length === 0) {
    return NextResponse.json(
      { success: false, error: "CSV is empty or missing a header row" },
      { status: 400 },
    );
  }

  const batchId = crypto.randomUUID();
  const adminSb = createServiceRoleClient();
  const base = appBaseUrl() || "https://ealhohq.com";

  const created: string[] = [];
  const errors: { row: number; email?: string; message: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2;
    const rec = rowToStaffRecord(headers, rawRows[i]);
    if (!rec) {
      errors.push({ row: rowNum, message: "Missing name or email" });
      continue;
    }
    if (!isValidEmail(rec.email)) {
      errors.push({ row: rowNum, email: rec.email, message: "Invalid email" });
      continue;
    }

    const existing = await findAuthUserByEmail(adminSb, rec.email);
    if (existing) {
      errors.push({
        row: rowNum,
        email: rec.email,
        message: "An account with this email already exists",
      });
      continue;
    }

    const inviteCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const first = rec.name.split(/\s+/)[0] ?? rec.name;

    let uidForRollback: string | undefined;

    try {
      const { data: createdUser, error: createError } =
        await adminSb.auth.admin.createUser({
          email: rec.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: rec.name,
            invite_code: inviteCode,
            invite_expires: expiresAt.toISOString(),
            needs_password_setup: true,
            partner_slug: partner.referralSlug,
          },
          app_metadata: {
            role: "patient",
            status: "active",
          },
        });

      if (createError || !createdUser.user) {
        errors.push({
          row: rowNum,
          email: rec.email,
          message: createError?.message ?? "Failed to create auth user",
        });
        continue;
      }

      const uid = createdUser.user.id;
      uidForRollback = uid;

      // Supabase `on_auth_user_created` trigger usually inserts `shared_profiles` before this
      // runs — use upsert so we never duplicate the row.
      await prisma.sharedProfile.upsert({
        where: { id: uid },
        create: {
          id: uid,
          role: "patient",
          fullName: rec.name,
          phone: rec.phone || null,
          status: "active",
        },
        update: {
          fullName: rec.name,
          phone: rec.phone || null,
          role: "patient",
          status: "active",
        },
      });

      const pc = await prisma.partnerClient.create({
        data: {
          superReferralPartnerId: partnerId,
          userId: uid,
          clientType,
          monthlyCreditsRemaining: 0,
          onboardingStatus: "pending",
          csvUploadBatchId: batchId,
        },
      });

      await prisma.therapyPatient.create({
        data: {
          profileId: uid,
          fullName: rec.name,
          email: rec.email,
          phone: rec.phone || "",
          gender: rec.gender || null,
          partnerClientId: pc.id,
        },
      });

      await adminSb.auth.admin.updateUserById(uid, {
        user_metadata: {
          full_name: rec.name,
          invite_code: inviteCode,
          invite_expires: expiresAt.toISOString(),
          needs_password_setup: true,
          partner_slug: partner.referralSlug,
          partner_client_id: pc.id,
        },
      });

      created.push(rec.email);

      if (sendInvites) {
        const setupLink = `${base.replace(/\/$/, "")}/auth/setup?email=${encodeURIComponent(rec.email)}&code=${inviteCode}&role=patient&partner=${encodeURIComponent(partner.referralSlug)}`;
        const html = partnerStaffInviteHtml({
          firstName: first,
          partnerName: partner.name,
          partnerLogoUrl: partner.logoUrl,
          inviteCode,
          setupLink,
        });
        const sent = await sendTransactionalEmail({
          to: rec.email,
          subject: partnerStaffInviteSubject(partner.name),
          html,
        });
        if (!sent.success) {
          errors.push({
            row: rowNum,
            email: rec.email,
            message: `Account created but email failed: ${sent.error ?? "unknown"}`,
          });
        }
      }
    } catch (e) {
      console.error("import-csv row", rowNum, e);
    captureApiError(e, { route: "/admin/super-referral-partners/[id]/import-csv" });
      if (uidForRollback) {
        await prisma.therapyPatient
          .deleteMany({ where: { profileId: uidForRollback } })
          .catch(() => undefined);
        await prisma.partnerClient
          .deleteMany({ where: { userId: uidForRollback } })
          .catch(() => undefined);
        await prisma.sharedProfile
          .deleteMany({ where: { id: uidForRollback } })
          .catch(() => undefined);
        await adminSb.auth.admin.deleteUser(uidForRollback).catch(() => undefined);
      }
      errors.push({
        row: rowNum,
        email: rec.email,
        message: importRowErrorMessage(e),
      });
    }
  }

  const clientCount = await prisma.partnerClient.count({
    where: { superReferralPartnerId: partnerId },
  });
  await prisma.superReferralPartner.update({
    where: { id: partnerId },
    data: { monthlyPoolSize: clientCount },
  });

  return NextResponse.json({
    success: true,
    data: {
      batchId,
      createdCount: created.length,
      createdEmails: created,
      errors,
      monthlyPoolSize: clientCount,
    },
  });
}
