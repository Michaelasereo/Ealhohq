import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { formatAmountToKobo } from "@/lib/paystack/client";
import { finalizeTherapyPayment } from "@/lib/payment/finalize-therapy-payment";
import { sendTherapyBookingPaidNotifications } from "@/lib/payment/send-therapy-booking-paid-notifications";
import { getPaystackSecretKey } from "@/lib/paystack/server-keys";
import { prisma } from "@/lib/prisma/client";
import { chargeSessionRateNgn } from "@/lib/referral/pricing";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { calculatePackagePrice, getPackageOption } from "@/lib/packages/config";

import { captureApiError } from "@/lib/sentry/capture";
function parseMetadata(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return typeof p === "object" && p !== null && !Array.isArray(p)
        ? Object.fromEntries(
            Object.entries(p as Record<string, unknown>).map(([k, v]) => [
              k,
              String(v),
            ]),
          )
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
        k,
        String(v),
      ]),
    );
  }
  return {};
}

export async function POST(req: Request) {
  try {
    const secret = (await getPaystackSecretKey()).trim();
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Paystack is not configured" },
        { status: 500 },
      );
    }

    const { reference, bookingId } = (await req.json()) as {
      reference?: string;
      bookingId?: string;
    };

    if (typeof reference !== "string" || !reference.trim()) {
      return NextResponse.json(
        { success: false, error: "reference required" },
        { status: 400 },
      );
    }
    if (typeof bookingId !== "string" || !bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference.trim())}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
    );

    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        metadata?: unknown;
      };
    };

    if (!payload.status || payload.data?.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: payload.message ?? "Payment verification failed",
        },
        { status: 400 },
      );
    }

    const meta = parseMetadata(payload.data?.metadata);
    if (meta.booking_id !== bookingId) {
      return NextResponse.json(
        { success: false, error: "Payment does not match this booking" },
        { status: 400 },
      );
    }

    const bookingRow = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: { therapist: true },
    });

    if (!bookingRow) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    const rate = chargeSessionRateNgn(bookingRow);
    const packageOption = getPackageOption(meta.package_type ?? "single");
    const packagePricing = calculatePackagePrice(rate, packageOption);
    const disc =
      bookingRow.discountAmount != null
        ? Number(bookingRow.discountAmount)
        : 0;
    const expectedKobo = formatAmountToKobo(
      Math.max(0, packagePricing.finalPrice - disc),
    );
    if (
      typeof payload.data?.amount === "number" &&
      payload.data.amount !== expectedKobo
    ) {
      return NextResponse.json(
        { success: false, error: "Paid amount does not match session rate" },
        { status: 400 },
      );
    }

    if (bookingRow.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "This booking was cancelled" },
        { status: 400 },
      );
    }

    const ref = payload.data?.reference ?? reference.trim();
    const { booking, sessionId, shouldSendConfirmationEmail } =
      await finalizeTherapyPayment(bookingId, ref, packageOption.id);

    if (
      bookingRow.discountCode &&
      meta.discount_code_id &&
      bookingRow.discountAmount != null
    ) {
      const existing = await prisma.discountCodeUse.findFirst({
        where: { bookingId },
      });
      if (!existing) {
        const code = await prisma.discountCode.findUnique({
          where: { id: meta.discount_code_id },
        });
        if (code && code.code === bookingRow.discountCode) {
          await prisma.$transaction(
            async (tx) => {
              await tx.discountCode.update({
                where: { id: code.id },
                data: { usedCount: { increment: 1 } },
              });
              await tx.discountCodeUse.create({
                data: {
                  codeId: code.id,
                  bookingId,
                  savedAmount: new Prisma.Decimal(
                    String(Number(bookingRow.discountAmount)),
                  ),
                },
              });
            },
            { timeout: 10_000 },
          );
        }
      }
    }

    if (shouldSendConfirmationEmail) {
      await sendTherapyBookingPaidNotifications(booking);
    }

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
        booking: {
          id: booking.id,
          date: booking.date.toISOString(),
          startTime: booking.startTime,
          endTime: booking.endTime,
          sessionDuration: booking.therapist.sessionDuration,
          sessionRateFormatted: `₦${Math.round(Number(booking.therapist.sessionRate)).toLocaleString("en-NG")}`,
          therapistName: therapistPublicLabel(booking.therapist.profile.fullName),
          therapistPhoto:
            booking.therapist.profilePhoto ?? "/Ealho-logo.png",
          sessionType: booking.sessionType,
          isAnonymous: booking.isAnonymous,
          guestEmail: booking.guestEmail ?? booking.patient?.email ?? null,
          guestSessionCount,
        },
        sessionId,
      },
    });
  } catch (e) {
    console.error("Payment verify error:", e);
    captureApiError(e, { route: "/payment/verify" });
    return NextResponse.json(
      { success: false, error: "Failed to verify payment" },
      { status: 500 },
    );
  }
}
