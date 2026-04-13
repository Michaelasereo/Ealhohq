import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { isPartnerUser } from "@/lib/auth/is-partner";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isPartnerUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partner = await prisma.referralPartner.findUnique({
      where: { email: user.email?.trim().toLowerCase() ?? "" },
    });
    if (!partner) {
      return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthSessions, monthEarnings, recent, pendingPayouts] = await Promise.all([
      prisma.referralSession.count({
        where: { partnerId: partner.id, status: { in: ["earned", "paid"] }, createdAt: { gte: monthStart } },
      }),
      prisma.referralSession.aggregate({
        where: { partnerId: partner.id, status: "earned", createdAt: { gte: monthStart } },
        _sum: { feeAmount: true },
      }),
      prisma.referralSession.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, createdAt: true, status: true, feeAmount: true },
      }),
      prisma.referralSession.aggregate({
        where: { partnerId: partner.id, status: "earned" },
        _sum: { feeAmount: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          contactName: partner.contactName,
          referralCode: partner.referralCode,
          tier: partner.tier,
          feePerSession: Number(partner.feePerSession),
        },
        stats: {
          sessionsThisMonth: monthSessions,
          earningsThisMonth: Number(monthEarnings._sum.feeAmount ?? 0),
          allTimeSessions: partner.totalReferred,
          allTimeEarnings: Number(partner.totalEarned),
          pendingPayout: Number(pendingPayouts._sum.feeAmount ?? 0),
        },
        referrals: recent.map((r) => ({
          id: r.id,
          date: r.createdAt.toISOString(),
          status: r.status,
          amount: Number(r.feeAmount),
        })),
        payoutThreshold: 10_000,
      },
    });
  } catch (e) {
    console.error("partners/dashboard GET:", e);
    captureApiError(e, { route: "/partners/dashboard" });
    return NextResponse.json({ error: "Failed to load partner dashboard" }, { status: 500 });
  }
}
