import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { watCurrentMonthStart } from "@/lib/wat-month";

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
      activePackagesCount,
      packageRevenueThisMonth,
      packageConversionRate,
      pendingApplications,
    ] = await Promise.all([
      prisma.therapyPatient.count(),
      prisma.therapyTherapist.count({ where: { status: "approved" } }),
      prisma.therapyTherapist.count({ where: { status: "pending" } }),
      prisma.therapySession.count({
        where: { createdAt: { gte: monthStart } },
      }),
      prisma.therapySessionPackage.count({ where: { status: "active" } }),
      prisma.therapySessionPackage.aggregate({
        _sum: { totalPaid: true },
        where: { createdAt: { gte: monthStart } },
      }),
      (async () => {
        const [pkg, single] = await Promise.all([
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
        const total = pkg + single;
        return total > 0 ? Math.round((pkg / total) * 100) : 0;
      })(),
      prisma.therapyTherapist.findMany({
        where: { status: "pending" },
        include: {
          profile: { select: { fullName: true, phone: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalPatients,
          totalTherapists,
          pendingTherapists,
          sessionsThisMonth,
          activePackagesCount,
          packageRevenueThisMonth: Number(packageRevenueThisMonth._sum.totalPaid ?? 0),
          packageConversionRate,
        },
        pendingApplications,
      },
    });
  } catch (e) {
    console.error("Admin dashboard:", e);
    return NextResponse.json(
      { error: "Failed to load admin dashboard" },
      { status: 500 },
    );
  }
}
