import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { toJoinPayload } from "@/lib/session/booking-join-payload";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { bookingId } = await ctx.params;

    const booking = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: {
        therapist: { include: { profile: true } },
        patient: { select: { profileId: true } },
        session: true,
        psychiatricSession: { include: { psychiatrist: true } },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    const data = toJoinPayload(booking);
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 },
    );
  }
}
