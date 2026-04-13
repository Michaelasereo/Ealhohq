import { NextResponse } from "next/server";

import { finalizeTherapyPaymentWithPartnerMonthlyCredit } from "@/lib/payment/finalize-therapy-payment";
import { sendTherapyBookingPaidNotifications } from "@/lib/payment/send-therapy-booking-paid-notifications";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
/**
 * Confirm a pending booking using employer partner pool credit (single session, logged-in patients only).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { bookingId?: string };
    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const booking = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: { patient: true },
    });
    if (!booking?.patientId || !booking.patient?.profileId) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }
    if (booking.patient.profileId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (booking.status !== "pending" || booking.paymentStatus !== "pending") {
      return NextResponse.json(
        { success: false, error: "Booking is not awaiting payment" },
        { status: 400 },
      );
    }
    try {
      const out = await finalizeTherapyPaymentWithPartnerMonthlyCredit(bookingId);
      if (out.shouldSendConfirmationEmail) {
        void sendTherapyBookingPaidNotifications(out.booking).catch((err) => {
          console.error("Partner coverage booking notifications:", err);
    captureApiError(err, { route: "/payment/partner-coverage" });
        });
      }
      return NextResponse.json({
        success: true,
        data: { bookingId, sessionId: out.sessionId },
      });
    } catch (e) {
      const SAFE_MESSAGES = new Set([
        "Booking not found or has no client",
        "Not enrolled in a partner programme",
        "Partner account setup is not complete",
        "No covered sessions remaining this month",
        "No employer pool exists for this month",
        "Employer pool is not yet approved for this month",
        "Booking not found",
      ]);
      const raw = e instanceof Error ? e.message : "";
      const msg = SAFE_MESSAGES.has(raw) ? raw : "Could not apply partner coverage";
      console.error("partner-coverage finalize:", e);
    captureApiError(e, { route: "/payment/partner-coverage" });
      return NextResponse.json({ success: false, error: msg }, { status: 400 });
    }
  } catch (e) {
    console.error("partner-coverage POST:", e);
    captureApiError(e, { route: "/payment/partner-coverage" });
    return NextResponse.json(
      { success: false, error: "Request failed" },
      { status: 500 },
    );
  }
}
