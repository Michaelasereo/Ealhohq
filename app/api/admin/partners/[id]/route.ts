import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { isAdminUser } from "@/lib/auth/is-admin";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

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
      tier?: "standard" | "premium";
      feePerSession?: number;
      bankName?: string | null;
      accountName?: string | null;
      accountNumber?: string | null;
      isActive?: boolean;
    };

    const data: Prisma.ReferralPartnerUpdateInput = {};
    if (body.tier) data.tier = body.tier;
    if (typeof body.feePerSession === "number" && body.feePerSession > 0) {
      data.feePerSession = new Prisma.Decimal(String(body.feePerSession));
    }
    if (body.bankName !== undefined) data.bankName = body.bankName || null;
    if (body.accountName !== undefined) data.accountName = body.accountName || null;
    if (body.accountNumber !== undefined) data.accountNumber = body.accountNumber || null;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await prisma.referralPartner.update({
      where: { id },
      data,
    });
    return NextResponse.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
  } catch (e) {
    console.error("admin/partners/[id] PATCH:", e);
    return NextResponse.json({ error: "Failed to update partner" }, { status: 500 });
  }
}
