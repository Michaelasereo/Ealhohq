import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { watCurrentMonthStart } from "@/lib/wat-month";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const monthStart = watCurrentMonthStart();
    const packages = await prisma.therapySessionPackage.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { include: { profile: { select: { fullName: true } } } },
        patient: { select: { id: true, fullName: true, email: true } },
      },
    });

    const byType = new Map<
      string,
      { sold: number; revenue: number; avgUsedBeforeExpiryAccumulator: number; avgCount: number }
    >();
    for (const p of packages) {
      const key = p.packageType;
      const row = byType.get(key) ?? {
        sold: 0,
        revenue: 0,
        avgUsedBeforeExpiryAccumulator: 0,
        avgCount: 0,
      };
      row.sold += 1;
      row.revenue += Number(p.totalPaid);
      if (p.status === "expired") {
        row.avgUsedBeforeExpiryAccumulator += p.usedSessions;
        row.avgCount += 1;
      }
      byType.set(key, row);
    }

    const activePackagesCount = packages.filter((p) => p.status === "active").length;
    const packageRevenueThisMonth = packages
      .filter((p) => p.createdAt >= monthStart)
      .reduce((sum, p) => sum + Number(p.totalPaid), 0);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          activePackagesCount,
          packageRevenueThisMonth,
        },
        packageStats: Array.from(byType.entries()).map(([packageType, value]) => ({
          packageType,
          totalSold: value.sold,
          revenue: value.revenue,
          averageSessionsUsedBeforeExpiry:
            value.avgCount > 0
              ? Number((value.avgUsedBeforeExpiryAccumulator / value.avgCount).toFixed(2))
              : 0,
        })),
        packages: packages.map((p) => ({
          id: p.id,
          packageType: p.packageType,
          totalSessions: p.totalSessions,
          usedSessions: p.usedSessions,
          remainingSessions: p.remainingSessions,
          totalPaid: Number(p.totalPaid),
          status: p.status,
          expiresAt: p.expiresAt?.toISOString() ?? null,
          createdAt: p.createdAt.toISOString(),
          therapist: {
            id: p.therapist.id,
            name: p.therapist.profile.fullName,
          },
          patient: {
            id: p.patient.id,
            name: p.patient.fullName,
            email: p.patient.email,
          },
        })),
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("admin/packages GET:", e);
    return NextResponse.json(
      { success: false, error: "Failed to fetch package analytics" },
      { status: 500 },
    );
  }
}
