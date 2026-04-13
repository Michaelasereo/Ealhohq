import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsApp } from "@/lib/whatsapp/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json()) as {
      status?: "approved" | "paid";
      reference?: string;
    };
    if (!body.status || !["approved", "paid"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (body.status === "approved") {
      const payout = await prisma.referralPayout.update({
        where: { id },
        data: { status: "approved" },
      });
      return NextResponse.json({ success: true, data: { id: payout.id, status: payout.status } });
    }

    const payout = await prisma.$transaction(
      async (tx) => {
        const updated = await tx.referralPayout.update({
          where: { id },
          data: {
            status: "paid",
            paidAt: new Date(),
            reference: body.reference?.trim() || null,
          },
          include: { partner: true },
        });
        await tx.referralSession.updateMany({
          where: { payoutId: updated.id },
          data: { status: "paid" },
        });
        await tx.referralPartner.update({
          where: { id: updated.partnerId },
          data: {
            totalPaid: { increment: updated.amount },
          },
        });
        return updated;
      },
      { timeout: 10_000 },
    );

    if (payout.partner.phone) {
      const last4 = payout.accountNumber ? payout.accountNumber.slice(-4) : "****";
      void sendWhatsApp({
        to: payout.partner.phone,
        body: `Hi ${payout.partner.contactName}! Your Ealho referral earnings of ₦${Math.round(Number(payout.amount)).toLocaleString()} for ${payout.sessionCount} sessions have been paid to your ${payout.bankName ?? "bank"} account ending ${last4}. Thank you for partnering with us!`,
      }).catch((err) => console.error("Partner payout WhatsApp:", err));
    }

    return NextResponse.json({ success: true, data: { id: payout.id, status: payout.status } });
  } catch (e) {
    console.error("admin/partners/payouts/[id] PATCH:", e);
    captureApiError(e, { route: "/admin/partners/payouts/[id]" });
    return NextResponse.json({ error: "Failed to update payout" }, { status: 500 });
  }
}
