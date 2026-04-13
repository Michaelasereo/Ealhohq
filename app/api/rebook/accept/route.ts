import { NextResponse } from "next/server";
import { z } from "zod";

import { ensurePendingBookingForRebookRequest } from "@/lib/rebooking/ensure-pending-booking";
import {
  loadBookingForNotify,
  notifyRebookBookingConfirmed,
} from "@/lib/rebooking/notify-confirmed";
import { getPatientByProfileId } from "@/lib/queries/patient";
import {
  finalizeTherapyPayment,
  finalizeTherapyPaymentWithCredits,
} from "@/lib/payment/finalize-therapy-payment";
import { verifyPaystackForBooking } from "@/lib/payment/verify-paystack-reference";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

import { captureApiError } from "@/lib/sentry/capture";
const bodySchema = z
  .object({
    requestId: z.string().uuid(),
    paystackReference: z.string().min(1).optional(),
    useCredits: z.boolean().optional(),
  })
  .strict()
  .refine((b) => b.paystackReference || b.useCredits === true, {
    message: "paystackReference or useCredits required",
  });

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { requestId, paystackReference, useCredits } = parsed.data;
    const now = new Date();

    const reqRow = await prisma.therapyRebookingRequest.findUnique({
      where: { id: requestId },
      include: {
        therapist: { include: { profile: true } },
        patient: true,
      },
    });

    if (!reqRow || reqRow.status !== "pending" || reqRow.expiresAt < now) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }

    let bookingId: string;
    let shouldSendEmail = false;

    if (useCredits) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const patient = await getPatientByProfileId(user.id);
      if (!patient || patient.id !== reqRow.patientId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const ensured = await ensurePendingBookingForRebookRequest(
        requestId,
        new Date(),
      );
      bookingId = ensured.bookingId;

      const cr = await finalizeTherapyPaymentWithCredits(bookingId);
      shouldSendEmail = cr.shouldSendConfirmationEmail;
    } else if (paystackReference) {
      const ensured = await ensurePendingBookingForRebookRequest(
        requestId,
        new Date(),
      );
      bookingId = ensured.bookingId;

      const v = await verifyPaystackForBooking(bookingId, paystackReference);
      if (!v.ok) {
        return NextResponse.json(
          { error: v.error },
          { status: v.status },
        );
      }

      const fr = await finalizeTherapyPayment(bookingId, v.reference);
      shouldSendEmail = fr.shouldSendConfirmationEmail;
    } else {
      return NextResponse.json({ error: "Invalid payment" }, { status: 400 });
    }

    await prisma.therapyRebookingRequest.update({
      where: { id: requestId },
      data: { status: "accepted", respondedAt: now },
    });

    const booking = await loadBookingForNotify(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking missing" }, { status: 500 });
    }

    await notifyRebookBookingConfirmed(booking, {
      sendEmail: shouldSendEmail,
    });

    return NextResponse.json({
      success: true,
      data: { bookingId },
    });
  } catch (e) {
    console.error("rebook accept:", e);
    captureApiError(e, { route: "/rebook/accept" });
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INVALID_REQUEST") {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }
    if (msg === "ALREADY_CONFIRMED") {
      return NextResponse.json(
        { error: "Already confirmed" },
        { status: 400 },
      );
    }
    if (msg === "Insufficient credits") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to confirm session" },
      { status: 500 },
    );
  }
}
