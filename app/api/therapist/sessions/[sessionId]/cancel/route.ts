import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { minutesUntilSessionStart } from "@/lib/session/join-access";

import { captureApiError } from "@/lib/sentry/capture";
type Ctx = { params: Promise<{ sessionId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
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
    const leadMinutes = body.leadMinutes ?? 120;

    const session = await prisma.therapySession.findFirst({
      where: { id: sessionId, therapistId: therapist.id },
      include: { booking: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const booking = session.booking;
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
    }

    const mins = minutesUntilSessionStart(
      booking.date,
      booking.startTime,
    );
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

    return NextResponse.json({
      success: true,
      data: { bookingId: booking.id },
    });
  } catch (e) {
    console.error("session cancel PATCH:", e);
    captureApiError(e, { route: "/therapist/sessions/[sessionId]/cancel" });
    return NextResponse.json(
      { error: "Failed to cancel" },
      { status: 500 },
    );
  }
}
