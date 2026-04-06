import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { bookingDateStartToIso } from "@/lib/wat-datetime";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { bookingId } = await ctx.params;

    const booking = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: {
        therapist: { include: { profile: true } },
        patient: { select: { email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (booking.status !== "confirmed" || booking.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Booking not available" },
        { status: 404 },
      );
    }

    const startIso = bookingDateStartToIso(booking.date, booking.startTime);

    let guestSessionCount = 0;
    if (booking.patientId) {
      guestSessionCount = await prisma.therapyBooking.count({
        where: {
          patientId: booking.patientId,
          status: { in: ["confirmed", "completed"] },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        therapistName: therapistPublicLabel(booking.therapist.profile.fullName),
        therapistPhoto:
          booking.therapist.profilePhoto ?? "/Ealho-logo.png",
        date: booking.date.toISOString(),
        startTime: booking.startTime,
        endTime: booking.endTime,
        startIso,
        durationMinutes: booking.therapist.sessionDuration,
        sessionType: booking.sessionType,
        isAnonymous: booking.isAnonymous,
        guestEmail: booking.guestEmail ?? booking.patient?.email ?? null,
        guestSessionCount,
      },
    });
  } catch (e) {
    console.error("booking confirmation:", e);
    return NextResponse.json(
      { error: "Failed to load booking" },
      { status: 500 },
    );
  }
}
