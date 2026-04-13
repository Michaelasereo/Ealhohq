import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { watCalendarDay, watCurrentMonthYm } from "@/lib/wat-datetime";

import { captureApiError } from "@/lib/sentry/capture";
/**
 * Run on the 1st of each month (e.g. Netlify scheduled function / DO cron).
 * Syncs partner client monthly credits with approved pool allocations.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const ok =
    secret &&
    auth === `Bearer ${secret}`;
  if (!ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const day = watCalendarDay();
  if (day !== 1) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Only runs on the 1st (WAT)",
    });
  }

  try {
    const monthYm = watCurrentMonthYm();
    const partners = await prisma.superReferralPartner.findMany({
      select: { id: true },
    });

    let partnersProcessed = 0;
    for (const p of partners) {
      const alloc = await prisma.partnerCreditAllocation.findUnique({
        where: {
          superReferralPartnerId_month: {
            superReferralPartnerId: p.id,
            month: monthYm,
          },
        },
      });

      if (alloc?.approvedByAdmin) {
        await prisma.partnerClient.updateMany({
          where: {
            superReferralPartnerId: p.id,
            onboardingStatus: "active",
          },
          data: { monthlyCreditsRemaining: 1 },
        });
      } else {
        await prisma.partnerClient.updateMany({
          where: { superReferralPartnerId: p.id },
          data: { monthlyCreditsRemaining: 0 },
        });
      }
      partnersProcessed += 1;
    }

    return NextResponse.json({
      success: true,
      data: { monthYm, partnersProcessed },
    });
  } catch (e) {
    console.error("partner-monthly-credits cron error:", e);
    captureApiError(e, { route: "/cron/partner-monthly-credits" });
    return NextResponse.json(
      { success: false, error: "Cron job failed" },
      { status: 500 },
    );
  }
}
