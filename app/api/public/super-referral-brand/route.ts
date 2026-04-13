import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
/**
 * Public branding for auth/setup (partner logo + name). Slug is not secret.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").trim().toUpperCase();
  if (!slug || slug.length > 32) {
    return NextResponse.json({ success: false, error: "Invalid slug" }, { status: 400 });
  }

  try {
    const p = await prisma.superReferralPartner.findUnique({
      where: { referralSlug: slug },
      select: {
        name: true,
        logoUrl: true,
        referralSlug: true,
      },
    });
    if (!p) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        name: p.name,
        logoUrl: p.logoUrl,
        referralSlug: p.referralSlug,
      },
    });
  } catch (e) {
    console.error("super-referral-brand GET:", e);
    captureApiError(e, { route: "/public/super-referral-brand" });
    return NextResponse.json(
      { success: false, error: "Failed to load" },
      { status: 500 },
    );
  }
}
