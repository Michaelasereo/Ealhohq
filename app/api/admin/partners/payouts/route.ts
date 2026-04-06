import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { isAdminUser } from "@/lib/auth/is-admin";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.referralPayout.findMany({
      where: { status: { in: ["pending", "approved"] } },
      include: { partner: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        partnerName: r.partner.name,
        partnerId: r.partnerId,
        amount: Number(r.amount),
        sessionCount: r.sessionCount,
        status: r.status,
        bankName: r.bankName,
        accountName: r.accountName,
        accountNumber: r.accountNumber,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("admin/partners/payouts GET:", e);
    return NextResponse.json({ error: "Failed to load payouts" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partners = await prisma.referralPartner.findMany({ where: { isActive: true } });
    const created: string[] = [];
    for (const partner of partners) {
      const sessions = await prisma.referralSession.findMany({
        where: { partnerId: partner.id, status: "earned", payoutId: null },
        select: { id: true, feeAmount: true },
      });
      if (!sessions.length) continue;
      const amount = sessions.reduce((sum, s) => sum + Number(s.feeAmount), 0);
      const payout = await prisma.$transaction(
        async (tx) => {
          const p = await tx.referralPayout.create({
            data: {
              partnerId: partner.id,
              amount: new Prisma.Decimal(String(amount)),
              sessionCount: sessions.length,
              status: "pending",
              bankName: partner.bankName,
              accountNumber: partner.accountNumber,
              accountName: partner.accountName,
              notes: "Bulk monthly payout generation",
            },
          });
          await tx.referralSession.updateMany({
            where: { id: { in: sessions.map((s) => s.id) } },
            data: { payoutId: p.id },
          });
          return p;
        },
        { timeout: 10_000 },
      );
      created.push(payout.id);
    }

    return NextResponse.json({ success: true, data: { createdCount: created.length, ids: created } });
  } catch (e) {
    console.error("admin/partners/payouts POST:", e);
    return NextResponse.json({ error: "Failed to generate payouts" }, { status: 500 });
  }
}
