import { NextResponse } from "next/server";

import { finalizeTherapyPayment } from "@/lib/payment/finalize-therapy-payment";
import { sendTherapyBookingPaidNotifications } from "@/lib/payment/send-therapy-booking-paid-notifications";
import { getPackageOption } from "@/lib/packages/config";

import { captureApiError } from "@/lib/sentry/capture";
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingId, paystackReference } = body as {
      bookingId?: string;
      paystackReference?: string | null;
      packageType?: string;
    };

    if (typeof bookingId !== "string" || !bookingId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "bookingId required",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    if (typeof paystackReference !== "string" || !paystackReference.trim()) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "paystackReference required",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    const packageType = getPackageOption(
      typeof body.packageType === "string" ? body.packageType : "single",
    ).id;

    const { booking, sessionId, shouldSendConfirmationEmail } =
      await finalizeTherapyPayment(bookingId, paystackReference.trim(), packageType);

    if (shouldSendConfirmationEmail) {
      await sendTherapyBookingPaidNotifications(booking);
    }

    return NextResponse.json({
      success: true,
      data: { booking, sessionId },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("Booking confirm error:", e);
    captureApiError(e, { route: "/bookings/confirm" });
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to confirm booking",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
