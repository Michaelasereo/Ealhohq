import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeSuperReferralSlug } from "@/lib/partners/referral-slug";
import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const patchBody = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactName: z.string().min(1).optional(),
  logoUrl: z.string().url().nullable().optional(),
  status: z.enum(["pending_payment", "active", "suspended"]).optional(),
  superPartnerId: z.string().uuid().nullable().optional(),
  referralSlug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Slug: letters, numbers, hyphen, underscore only")
    .optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.superPartnerId) {
      const sp = await prisma.superPartner.findFirst({
        where: { id: parsed.data.superPartnerId, isActive: true },
        select: { id: true },
      });
      if (!sp) {
        return NextResponse.json(
          { success: false, error: "Super partner not found or inactive" },
          { status: 400 },
        );
      }
    }

    const { referralSlug: slugIn, ...restIn } = parsed.data;

    let normalizedSlug: string | undefined;
    if (slugIn !== undefined) {
      normalizedSlug = normalizeSuperReferralSlug(slugIn);
      if (normalizedSlug.length < 2) {
        return NextResponse.json(
          { success: false, error: "Referral slug must be at least 2 characters after normalizing" },
          { status: 400 },
        );
      }
      const taken = await prisma.superReferralPartner.findFirst({
        where: { referralSlug: normalizedSlug, NOT: { id } },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { success: false, error: "That referral slug is already in use" },
          { status: 409 },
        );
      }
    }

    const row = await prisma.superReferralPartner.update({
      where: { id },
      data: {
        ...restIn,
        ...(parsed.data.contactEmail
          ? { contactEmail: parsed.data.contactEmail.trim().toLowerCase() }
          : {}),
        ...(normalizedSlug !== undefined ? { referralSlug: normalizedSlug } : {}),
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        logoUrl: row.logoUrl,
        contactEmail: row.contactEmail,
        contactName: row.contactName,
        referralSlug: row.referralSlug,
        status: row.status,
        superPartnerId: row.superPartnerId,
      },
    });
  } catch (e) {
    console.error("super-referral-partners PATCH:", e);
    captureApiError(e, { route: "/admin/super-referral-partners/[id]" });
    return NextResponse.json(
      { success: false, error: "Could not update partner" },
      { status: 500 },
    );
  }
}
