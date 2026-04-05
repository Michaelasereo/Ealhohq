import { NextResponse } from "next/server";
import { z } from "zod";

import {
  loadBookingForNotify,
  notifyRebookBookingConfirmed,
} from "@/lib/rebooking/notify-confirmed";
import { finalizeTherapyPayment } from "@/lib/payment/finalize-therapy-payment";
import { verifyPaystackForBooking } from "@/lib/payment/verify-paystack-reference";
import { prisma } from "@/lib/prisma/client";

const schema = z
  .object({
    requestId: z.string().uuid(),
    bookingId: z.string().uuid(),
    reference: z.string().min(1),
  })
  .strict();

/**
 * Called from the public rebook confirm page after Paystack redirects back.
 * Idempotent with `/api/payment/verify` + marks the rebooking request accepted.
 */
export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body" },
        { status: 400 },
      );
    }

    const { requestId, bookingId, reference } = parsed.data;
    const now = new Date();

    const reqRow = await prisma.therapyRebookingRequest.findUnique({
      where: { id: requestId },
    });

    if (!reqRow || reqRow.expiresAt < now) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }

    if (!reqRow.bookingId || reqRow.bookingId !== bookingId) {
      return NextResponse.json(
        { error: "Booking does not match this invitation" },
        { status: 400 },
      );
    }

    const v = await verifyPaystackForBooking(bookingId, reference);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: v.status });
    }

    const fr = await finalizeTherapyPayment(bookingId, v.reference);

    await prisma.therapyRebookingRequest.update({
      where: { id: requestId },
      data: { status: "accepted", respondedAt: new Date(), bookingId },
    });

    const booking = await loadBookingForNotify(bookingId);
    if (booking) {
      await notifyRebookBookingConfirmed(booking, {
        sendEmail: fr.shouldSendConfirmationEmail,
      });
    }

    return NextResponse.json({ success: true, data: { bookingId } });
  } catch (e) {
    console.error("rebook after-paystack:", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INVALID_REQUEST" || msg === "ALREADY_CONFIRMED") {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to complete booking" },
      { status: 500 },
    );
  }
}
