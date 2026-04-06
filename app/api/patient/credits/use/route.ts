import { NextResponse } from "next/server";
import { z } from "zod";

import { tierFromBalance } from "@/lib/credits/purchase-config";
import { finalizeTherapyPaymentWithCredits } from "@/lib/payment/finalize-therapy-payment";
import { sendTherapyBookingPaidNotifications } from "@/lib/payment/send-therapy-booking-paid-notifications";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const bodySchema = z
  .object({
    bookingId: z.string().uuid(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 },
      );
    }

    const { bookingId } = parsed.data;

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Client profile not found" },
        { status: 403 },
      );
    }

    const booking = await prisma.therapyBooking.findFirst({
      where: {
        id: bookingId,
        patientId: patient.id,
        status: "pending",
        paymentStatus: "pending",
      },
      select: { id: true },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking not found or not awaiting credit payment",
        },
        { status: 404 },
      );
    }

    const result = await finalizeTherapyPaymentWithCredits(bookingId);

    if (result.shouldSendConfirmationEmail) {
      await sendTherapyBookingPaidNotifications(result.booking);
    }

    const credit = await prisma.therapyCredit.findUnique({
      where: { patientId: patient.id },
    });
    const balance = Number(credit?.balance ?? 0);

    return NextResponse.json({
      success: true,
      data: {
        balance,
        tier: tierFromBalance(balance),
        sessionId: result.sessionId,
      },
    });
  } catch (e) {
    console.error("client credits/use POST:", e);
    const msg = e instanceof Error ? e.message : "Failed to use credit";
    return NextResponse.json(
      { success: false, error: msg },
      { status: msg.includes("Insufficient") ? 400 : 500 },
    );
  }
}
