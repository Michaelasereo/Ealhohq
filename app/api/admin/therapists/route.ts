import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { prisma } from "@/lib/prisma/client";

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

    const therapists = await prisma.therapyTherapist.findMany({
      where,
      include: {
        profile: true,
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
        return {
          ...t,
          sessionRate: Number(t.sessionRate),
          email: authUser.user?.email ?? null,
        };
      }),
    );

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("admin therapists GET:", e);
    return NextResponse.json(
      { error: "Failed to load therapists" },
      { status: 500 },
    );
  }
}
