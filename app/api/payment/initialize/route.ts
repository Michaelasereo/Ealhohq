import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  formatAmountToKobo,
  generateReference,
} from "@/lib/paystack/client";
import { computeDiscountForSession } from "@/lib/discount/compute";
import {
  finalizeFreeTherapyWithDiscount,
} from "@/lib/payment/finalize-therapy-payment";
import { sendTherapyBookingPaidNotifications } from "@/lib/payment/send-therapy-booking-paid-notifications";
import { getPaystackSecretKey } from "@/lib/paystack/server-keys";
import { prisma } from "@/lib/prisma/client";
import { chargeSessionRateNgn } from "@/lib/referral/pricing";

function appUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, "") : null;
}

export async function POST(req: Request) {
  try {
    const base = appUrl();
    if (!base) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_APP_URL is not set" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as {
      bookingId?: string;
      email?: string;
      metadata?: Record<string, string>;
      discountCode?: string;
      /** e.g. `/rebook/confirm/<uuid>` — Paystack redirects here after payment */
      rebookRequestId?: string;
      /** Inline dashboard booking — return to `/dashboard?booking=success&bookingId=…` */
      returnToPatientDashboard?: boolean;
    };

    const bookingId = body.bookingId;
    if (typeof bookingId !== "string" || !bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 },
      );
    }

    const booking = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: {
        therapist: true,
        patient: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    if (booking.status !== "pending" || booking.paymentStatus !== "pending") {
      return NextResponse.json(
        { success: false, error: "Booking is not awaiting payment" },
        { status: 400 },
      );
    }

    if (booking.discountCode) {
      return NextResponse.json(
        { success: false, error: "A discount is already applied to this booking" },
        { status: 400 },
      );
    }

    const sessionRate = chargeSessionRateNgn(booking);
    const discountInput =
      typeof body.discountCode === "string" ? body.discountCode.trim() : "";

    if (discountInput) {
      const normalized = discountInput.toUpperCase();
      const disc = await prisma.discountCode.findFirst({
        where: { code: normalized, isActive: true },
      });
      if (!disc) {
        return NextResponse.json(
          { success: false, error: "Invalid discount code" },
          { status: 400 },
        );
      }
      if (disc.expiresAt && disc.expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: "This discount code has expired" },
          { status: 400 },
        );
      }
      if (disc.maxUses != null && disc.usedCount >= disc.maxUses) {
        return NextResponse.json(
          { success: false, error: "This discount code has reached its limit" },
          { status: 400 },
        );
      }

      const calc = computeDiscountForSession(sessionRate, disc);
      if (calc.isFree) {
        try {
          const out = await finalizeFreeTherapyWithDiscount({
            bookingId,
            discount: disc,
            savedAmountNgn: calc.discountAmount,
          });
          if (out.shouldSendConfirmationEmail) {
            void sendTherapyBookingPaidNotifications(out.booking).catch(
              (err) => {
                console.error("Therapy booking paid notifications:", err);
              },
            );
          }
        } catch (e) {
          console.error("Free discount finalize:", e);
          return NextResponse.json(
            {
              success: false,
              error:
                e instanceof Error ? e.message : "Could not apply discount",
            },
            { status: 400 },
          );
        }
        return NextResponse.json({
          success: true,
          data: {
            isFree: true,
            bookingId,
          },
        });
      }

      await prisma.therapyBooking.update({
        where: { id: bookingId },
        data: {
          discountCode: disc.code,
          discountAmount: new Prisma.Decimal(String(calc.discountAmount)),
        },
      });
    }

    const secret = (await getPaystackSecretKey()).trim();
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Paystack is not configured" },
        { status: 500 },
      );
    }

    const payEmail =
      (typeof body.email === "string" && body.email.trim()) ||
      booking.guestEmail ||
      booking.patient?.email;

    if (!payEmail?.trim()) {
      return NextResponse.json(
        { success: false, error: "No email on file for this booking" },
        { status: 400 },
      );
    }

    if (body.email?.trim()) {
      const normalized = body.email.trim().toLowerCase();
      const expectedGuest = booking.guestEmail?.trim().toLowerCase();
      const expectedPatient = booking.patient?.email?.trim().toLowerCase();
      const matches =
        (expectedGuest && normalized === expectedGuest) ||
        (expectedPatient && normalized === expectedPatient);
      if (!matches) {
        return NextResponse.json(
          { success: false, error: "Email does not match this booking" },
          { status: 403 },
        );
      }
    }

    const bookingAfterDisc = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: { therapist: true },
    });
    if (!bookingAfterDisc) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }
    const rate = chargeSessionRateNgn(bookingAfterDisc);
    const discAmt =
      bookingAfterDisc.discountAmount != null
        ? Number(bookingAfterDisc.discountAmount)
        : 0;
    const chargeNgn = Math.max(0, rate - discAmt);
    const amountKobo = formatAmountToKobo(chargeNgn);

    const reference = generateReference();

    let callbackPath: string;
    const rebookId =
      typeof body.rebookRequestId === "string"
        ? body.rebookRequestId.trim()
        : "";
    if (
      rebookId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rebookId,
      )
    ) {
      callbackPath = `/rebook/confirm/${rebookId}?paid=1&bookingId=${encodeURIComponent(bookingId)}`;
    } else if (body.returnToPatientDashboard) {
      callbackPath = `/dashboard?booking=success&bookingId=${encodeURIComponent(bookingId)}`;
    } else {
      const isGuestFlow = Boolean(booking.guestEmail);
      callbackPath = isGuestFlow
        ? `/book/success?bookingId=${encodeURIComponent(bookingId)}`
        : `/dashboard/book/success?bookingId=${encodeURIComponent(bookingId)}`;
    }
    const callback_url = `${base}${callbackPath}`;

    const meta: Record<string, string> = {
      product: "therapy",
      booking_id: bookingId,
    };
    if (bookingAfterDisc.discountCode) {
      const dc = await prisma.discountCode.findFirst({
        where: { code: bookingAfterDisc.discountCode },
      });
      if (dc) meta.discount_code_id = dc.id;
    }
    if (rebookId) meta.rebook_request_id = rebookId;
    if (body.metadata && typeof body.metadata === "object") {
      for (const [k, v] of Object.entries(body.metadata)) {
        if (typeof v === "string") meta[k] = v;
      }
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: payEmail.trim(),
          amount: amountKobo,
          reference,
          metadata: meta,
          callback_url,
        }),
      },
    );

    const data = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
      };
    };

    if (!data.status || !data.data?.authorization_url) {
      return NextResponse.json(
        { success: false, error: data.message ?? "Paystack initialize failed" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reference,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Payment initialization failed" },
      { status: 500 },
    );
  }
}
