import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
type Ctx = { params: Promise<{ bookingId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { bookingId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction([
      prisma.therapyBooking.update({
        where: { id: bookingId },
        data: { status: "cancelled" },
      }),
      prisma.therapySession.updateMany({
        where: { bookingId },
        data: { status: "cancelled" },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin cancel booking:", e);
    captureApiError(e, { route: "/admin/bookings/[bookingId]/cancel" });
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 },
    );
  }
}
