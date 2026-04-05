import crypto from "crypto";
import { NextResponse } from "next/server";

import { finalizeCreditPurchase } from "@/lib/payment/finalize-credit-purchase";
import { finalizeTherapyPayment } from "@/lib/payment/finalize-therapy-payment";
import { sendTherapyBookingPaidNotifications } from "@/lib/payment/send-therapy-booking-paid-notifications";
import { getPaystackSecretKey } from "@/lib/paystack/server-keys";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

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
      return NextResponse.json({ received: true });
    }

    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    const hash = crypto
      .createHmac("sha512", secret)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body) as {
      event?: string;
      data?: {
        reference?: string;
        metadata?: unknown;
      };
    };

    const event = payload.event;
    const data = payload.data;
    const metadata = parseMetadata(data?.metadata);

    if (metadata.product !== "therapy") {
      return NextResponse.json({ received: true });
    }

    if (metadata.type === "credit_purchase" && metadata.patient_id) {
      if (event === "charge.success" && data?.reference) {
        try {
          const credits = Number(metadata.credits);
          if (Number.isFinite(credits) && credits > 0) {
            await finalizeCreditPurchase({
              patientId: metadata.patient_id,
              credits,
              paystackReference: data.reference,
              packageKey: metadata.package ?? "bronze",
            });
          }
        } catch (e) {
          console.error("Paystack webhook credit finalize error:", e);
        }
      }
      return NextResponse.json({ received: true });
    }

    const bookingId = metadata.booking_id;
    if (!bookingId) {
      return NextResponse.json({ received: true });
    }

    if (event === "charge.success" && data?.reference) {
      try {
        const { booking, shouldSendConfirmationEmail } =
          await finalizeTherapyPayment(bookingId, data.reference);
        if (shouldSendConfirmationEmail) {
          await sendTherapyBookingPaidNotifications(booking);
        }
      } catch (e) {
        console.error("Paystack webhook finalize error:", e);
      }
    }

    if (event === "charge.failed") {
      await prisma.therapyBooking.updateMany({
        where: { id: bookingId, status: "pending" },
        data: { status: "cancelled" },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true });
  }
}
