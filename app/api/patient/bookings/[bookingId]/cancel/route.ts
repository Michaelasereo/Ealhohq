import { NextResponse } from "next/server";

import {
  formatBookingDateLong,
  formatSlotTo12h,
} from "@/lib/booking/display-wat";
import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { templates } from "@/lib/whatsapp/templates";
import { bookingDateStartToIso } from "@/lib/wat-datetime";

type Ctx = { params: Promise<{ bookingId: string }> };

type CancelResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

async function cancelBookingForPatient(
  bookingId: string,
  userId: string,
): Promise<CancelResult> {
  const patient = await getPatientByProfileId(userId);
  if (!patient) {
    return { ok: false, error: "Forbidden", status: 403 };
  }

  const booking = await prisma.therapyBooking.findFirst({
    where: {
      id: bookingId,
      patientId: patient.id,
      status: "confirmed",
    },
    include: {
      therapist: { include: { profile: true } },
      patient: true,
    },
  });

  if (!booking) {
    return {
      ok: false,
      error: "Booking not found or cannot be cancelled",
      status: 404,
    };
  }

  const startIso = bookingDateStartToIso(booking.date, booking.startTime);
  const hoursUntil =
    (new Date(startIso).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil <= 24) {
    return {
      ok: false,
      error: "Cannot cancel within 24 hours",
      status: 400,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.therapyBooking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });

    await tx.therapySession.updateMany({
      where: { bookingId },
      data: { status: "cancelled" },
    });

    if (booking.paidWithCredits) {
      const credit = await tx.therapyCredit.findUnique({
        where: { patientId: patient.id },
      });
      if (credit) {
        await tx.therapyCredit.update({
          where: { patientId: patient.id },
          data: { balance: { increment: 1 } },
        });
      } else {
        await tx.therapyCredit.create({
          data: {
            patientId: patient.id,
            balance: 1,
          },
        });
      }
      await tx.therapyCreditTransaction.create({
        data: {
          patientId: patient.id,
          amount: 1,
          type: "refund",
          reference: bookingId,
        },
      });
    }
  });

  const phone = booking.guestPhone ?? booking.patient?.phone;
  if (phone?.trim()) {
    void sendWhatsApp({
      to: phone,
      body: templates.sessionCancelled({
        patientName:
          booking.guestName ?? booking.patient?.fullName ?? "there",
        therapistName: booking.therapist.profile.fullName,
        date: formatBookingDateLong(booking.date),
        time: formatSlotTo12h(booking.startTime),
        isAnonymous: booking.isAnonymous,
      }),
    }).catch((err) => console.error("WhatsApp cancel notify failed:", err));
  }

  return { ok: true };
}

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { bookingId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await cancelBookingForPatient(bookingId, user.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("cancel booking POST:", e);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 },
    );
  }
}

export async function PATCH(_req: Request, ctx: Ctx) {
  try {
    const { bookingId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await cancelBookingForPatient(bookingId, user.id);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("cancel booking PATCH:", e);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 },
    );
  }
}
