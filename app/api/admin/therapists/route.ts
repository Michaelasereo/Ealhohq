import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import {
  DEFAULT_PLATFORM_PERCENT,
  DEFAULT_THERAPIST_PERCENT,
} from "@/lib/defaults/earnings-split";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = (searchParams.get("status") ?? "all").toLowerCase();

    const where =
      statusFilter === "all"
        ? {}
        : { status: statusFilter };

    const sessionAgg = await prisma.therapySession.groupBy({
      by: ["therapistId"],
      where: {
        status: "completed",
        booking: { paymentStatus: "paid" },
      },
      _sum: { therapistEarnings: true },
      _count: { _all: true },
    });
    const aggByTherapist = new Map(
      sessionAgg.map((r) => [
        r.therapistId,
        {
          totalTherapistEarnings: r._sum.therapistEarnings
            ? Number(r._sum.therapistEarnings)
            : 0,
          paidCompletedSessions: r._count._all,
        },
      ]),
    );

    const therapists = await prisma.therapyTherapist.findMany({
      where,
      include: {
        profile: true,
        earningsConfig: true,
        _count: { select: { sessions: true, bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const adminSb = createServiceRoleClient();
    const data = await Promise.all(
      therapists.map(async (t) => {
        const { data: authUser } = await adminSb.auth.admin.getUserById(
          t.profileId,
        );
        const cfg = t.earningsConfig;
        const therapistPercent = cfg
          ? Number(cfg.therapistPercent)
          : DEFAULT_THERAPIST_PERCENT;
        const platformPercent = cfg
          ? Number(cfg.platformPercent)
          : DEFAULT_PLATFORM_PERCENT;
        const agg = aggByTherapist.get(t.id);
        return {
          ...t,
          sessionRate: Number(t.sessionRate),
          email: authUser.user?.email ?? null,
          therapistPercent,
          platformPercent,
          totalTherapistEarnings: agg?.totalTherapistEarnings ?? 0,
          paidCompletedSessions: agg?.paidCompletedSessions ?? 0,
        };
      }),
    );

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("admin therapists GET:", e);
    captureApiError(e, { route: "/admin/therapists" });
    return NextResponse.json(
      { error: "Failed to load therapists" },
      { status: 500 },
    );
  }
}
