import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { toJoinPayload } from "@/lib/session/booking-join-payload";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;

    const row = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      select: { bookingId: true },
    });

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    const booking = await prisma.therapyBooking.findUnique({
      where: { id: row.bookingId },
      include: {
        therapist: { include: { profile: true } },
        patient: { select: { profileId: true } },
        session: true,
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
