import { NextResponse } from "next/server";

import {
  formatAmountToKobo,
  generateReference,
} from "@/lib/paystack/client";
import { getPaystackSecretKey } from "@/lib/paystack/server-keys";
import { prisma } from "@/lib/prisma/client";

function appUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, "") : null;
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
      /** e.g. `/rebook/confirm/<uuid>` — Paystack redirects here after payment */
      rebookRequestId?: string;
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

    const amountKobo = formatAmountToKobo(
      Number(booking.therapist.sessionRate),
    );

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
