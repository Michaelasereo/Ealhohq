import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { watCurrentMonthStart } from "@/lib/wat-month";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const monthStart = watCurrentMonthStart();

    const [
      totalPatients,
      totalTherapists,
      pendingTherapists,
      sessionsThisMonth,
      pendingApplications,
    ] = await Promise.all([
      prisma.therapyPatient.count(),
      prisma.therapyTherapist.count({ where: { status: "approved" } }),
      prisma.therapyTherapist.count({ where: { status: "pending" } }),
      prisma.therapySession.count({
        where: { createdAt: { gte: monthStart } },
      }),
      prisma.therapyTherapist.findMany({
        where: { status: "pending" },
        include: {
          profile: { select: { fullName: true, phone: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Gracefully handle DBs where session package migration has not been applied yet.
    let activePackagesCount = 0;
    let packageRevenueThisMonth = 0;
    let packageConversionRate = 0;
    try {
      const [pkgCount, pkgRevenue, pkg, single] = await Promise.all([
        prisma.therapySessionPackage.count({ where: { status: "active" } }),
        prisma.therapySessionPackage.aggregate({
          _sum: { totalPaid: true },
          where: { createdAt: { gte: monthStart } },
        }),
        prisma.therapyBooking.count({
          where: {
            status: { in: ["confirmed", "completed"] },
            packageId: { not: null },
          },
        }),
        prisma.therapyBooking.count({
          where: {
            status: { in: ["confirmed", "completed"] },
            packageId: null,
          },
        }),
      ]);
      activePackagesCount = pkgCount;
      packageRevenueThisMonth = Number(pkgRevenue._sum.totalPaid ?? 0);
      const total = pkg + single;
      packageConversionRate = total > 0 ? Math.round((pkg / total) * 100) : 0;
    } catch {
      // keep zero defaults
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalPatients,
          totalTherapists,
          pendingTherapists,
          sessionsThisMonth,
          activePackagesCount,
          packageRevenueThisMonth,
          packageConversionRate,
        },
        pendingApplications,
      },
    });
  } catch (e) {
    console.error("Admin dashboard:", e);
    captureApiError(e, { route: "/admin/dashboard" });
    return NextResponse.json(
      { error: "Failed to load admin dashboard" },
      { status: 500 },
    );
  }
}
