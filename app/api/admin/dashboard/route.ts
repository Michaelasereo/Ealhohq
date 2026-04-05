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

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalPatients,
          totalTherapists,
          pendingTherapists,
          sessionsThisMonth,
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
