import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { isPartnerUser } from "@/lib/auth/is-partner";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

import { captureApiError } from "@/lib/sentry/capture";
const MIN_PAYOUT_NGN = 10_000;

export async function POST() {
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

    const earnedRows = await prisma.referralSession.findMany({
      where: { partnerId: partner.id, status: "earned", payoutId: null },
      select: { id: true, feeAmount: true },
    });
    const total = earnedRows.reduce((sum, row) => sum + Number(row.feeAmount), 0);
    if (total < MIN_PAYOUT_NGN) {
      return NextResponse.json(
        { error: `Minimum payout threshold is ₦${MIN_PAYOUT_NGN.toLocaleString()}` },
        { status: 400 },
      );
    }
    if (!earnedRows.length) {
      return NextResponse.json({ error: "No earned referrals to payout" }, { status: 400 });
    }

    const payout = await prisma.$transaction(
      async (tx) => {
        const created = await tx.referralPayout.create({
          data: {
            partnerId: partner.id,
            amount: new Prisma.Decimal(String(total)),
            sessionCount: earnedRows.length,
            status: "pending",
            bankName: partner.bankName,
            accountNumber: partner.accountNumber,
            accountName: partner.accountName,
            notes: "Partner requested payout",
          },
        });
        await tx.referralSession.updateMany({
          where: { id: { in: earnedRows.map((r) => r.id) } },
          data: { payoutId: created.id },
        });
        return created;
      },
      { timeout: 10_000 },
    );

    return NextResponse.json({ success: true, data: { payoutId: payout.id } });
  } catch (e) {
    console.error("partners/payout-request POST:", e);
    captureApiError(e, { route: "/partners/payout-request" });
    return NextResponse.json({ error: "Failed to request payout" }, { status: 500 });
  }
}
