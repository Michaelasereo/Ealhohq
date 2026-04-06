import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const partner = await prisma.referralPartner.findFirst({
      where: { referralSlug: slug, isActive: true },
      select: { name: true, city: true, tier: true, referralCode: true },
    });
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        name: partner.name,
        city: partner.city,
        tier: partner.tier,
        referralCode: partner.referralCode,
      },
    });
  } catch (e) {
    console.error("referral/partner/[slug] GET:", e);
    return NextResponse.json({ error: "Failed to fetch partner" }, { status: 500 });
  }
}
