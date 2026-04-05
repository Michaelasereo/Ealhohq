import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { minutesUntilSessionStart } from "@/lib/session/join-access";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { bookingId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      leadMinutes?: number;
    };
    const leadMinutes = body.leadMinutes ?? 1440;

    const booking = await prisma.therapyBooking.findFirst({
      where: { id: bookingId, therapistId: therapist.id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    }

    const mins = minutesUntilSessionStart(booking.date, booking.startTime);
    if (mins < leadMinutes) {
      return NextResponse.json(
        {
          error: `Cancellation requires at least ${leadMinutes} minutes before start`,
        },
        { status: 400 },
      );
    }

    await prisma.therapyBooking.update({
      where: { id: booking.id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("booking cancel PATCH:", e);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
