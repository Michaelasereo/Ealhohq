import { NextResponse } from "next/server";
import { z } from "zod";

import { getAvailableSlots } from "@/lib/availability/slots";
import { getPatientByProfileId } from "@/lib/queries/patient";
import { bookingEndTime } from "@/lib/rebooking/validate-request";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { hoursUntilSessionStart } from "@/lib/cancellation/hours-until";
import { bookingDateToWatYmd, watDayStart } from "@/lib/wat-datetime";

const bodySchema = z
  .object({
    bookingId: z.string().uuid(),
    newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    newStartTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await getPatientByProfileId(user.id);
    if (!patient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { bookingId, newDate, newStartTime } = parsed.data;

    const booking = await prisma.therapyBooking.findFirst({
      where: {
        id: bookingId,
        patientId: patient.id,
        status: "confirmed",
      },
      include: { therapist: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 },
      );
    }

    if (booking.rescheduleCount >= 2) {
      return NextResponse.json(
        {
          error:
            "Maximum reschedules reached for this booking. Please cancel and book again.",
        },
        { status: 400 },
      );
    }

    const hoursUntil = hoursUntilSessionStart(booking.date, booking.startTime);
    if (hoursUntil < 2) {
      return NextResponse.json(
        { error: "Cannot reschedule within 2 hours of session start." },
        { status: 400 },
      );
    }

    const slots = await getAvailableSlots(booking.therapistId, newDate);
    const currentYmd = bookingDateToWatYmd(booking.date);
    const slotOk =
      slots.includes(newStartTime) ||
      (newDate === currentYmd && newStartTime === booking.startTime);

    if (!slotOk) {
      return NextResponse.json(
        { error: "Selected slot is not available." },
        { status: 409 },
      );
    }

    const newEndTime = bookingEndTime(
      newStartTime,
      booking.therapist.sessionDuration,
    );

    await prisma.therapyBooking.update({
      where: { id: bookingId },
      data: {
        date: watDayStart(newDate),
        startTime: newStartTime,
        endTime: newEndTime,
        rescheduleCount: { increment: 1 },
        lastRescheduledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("sessions/reschedule POST:", e);
    return NextResponse.json(
      { error: "Failed to reschedule" },
      { status: 500 },
    );
  }
}
