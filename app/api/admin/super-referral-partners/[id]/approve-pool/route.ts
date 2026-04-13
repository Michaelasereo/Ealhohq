import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const bodySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

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

  const { month } = parsed.data;

  const monthNum = parseInt(month.split("-")[1], 10);
  if (monthNum < 1 || monthNum > 12) {
    return NextResponse.json(
      { success: false, error: "Invalid month (must be 01–12)" },
      { status: 400 },
    );
  }

  try {
    const activeCount = await prisma.partnerClient.count({
      where: {
        superReferralPartnerId: partnerId,
        onboardingStatus: "active",
      },
    });

    await prisma.partnerCreditAllocation.upsert({
      where: {
        superReferralPartnerId_month: {
          superReferralPartnerId: partnerId,
          month,
        },
      },
      create: {
        superReferralPartnerId: partnerId,
        month,
        totalPool: activeCount,
        usedCredits: 0,
        approvedByAdmin: true,
        approvedAt: new Date(),
      },
      update: {
        totalPool: activeCount,
        approvedByAdmin: true,
        approvedAt: new Date(),
      },
    });

    await prisma.partnerClient.updateMany({
      where: {
        superReferralPartnerId: partnerId,
        onboardingStatus: "active",
      },
      data: { monthlyCreditsRemaining: 1 },
    });

    return NextResponse.json({
      success: true,
      data: {
        month,
        activeStaff: activeCount,
        creditsGrantedPerClient: 1,
      },
    });
  } catch (e) {
    console.error("approve-pool error:", e);
    captureApiError(e, { route: "/admin/super-referral-partners/[id]/approve-pool" });
    return NextResponse.json(
      { success: false, error: "Failed to approve pool" },
      { status: 500 },
    );
  }
}
