import { formatAmountToKobo } from "@/lib/paystack/client";
import { getPaystackSecretKey } from "@/lib/paystack/server-keys";
import { prisma } from "@/lib/prisma/client";

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

export type PaystackVerifyOk = {
  reference: string;
  bookingId: string;
};

export async function verifyPaystackForBooking(
  bookingId: string,
  reference: string,
): Promise<
  | { ok: true; reference: string }
  | { ok: false; error: string; status: number }
> {
  const secret = (await getPaystackSecretKey()).trim();
  if (!secret) {
    return { ok: false, error: "Paystack is not configured", status: 500 };
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference.trim())}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
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
    return {
      ok: false,
      error: payload.message ?? "Payment verification failed",
      status: 400,
    };
  }

  const meta = parseMetadata(payload.data?.metadata);
  if (meta.booking_id !== bookingId) {
    return {
      ok: false,
      error: "Payment does not match this booking",
      status: 400,
    };
  }

  const bookingRow = await prisma.therapyBooking.findUnique({
    where: { id: bookingId },
    include: { therapist: true },
  });

  if (!bookingRow) {
    return { ok: false, error: "Booking not found", status: 404 };
  }

  const expectedKobo = formatAmountToKobo(
    Number(bookingRow.therapist.sessionRate),
  );
  if (
    typeof payload.data?.amount === "number" &&
    payload.data.amount !== expectedKobo
  ) {
    return {
      ok: false,
      error: "Paid amount does not match session rate",
      status: 400,
    };
  }

  if (bookingRow.status === "cancelled") {
    return { ok: false, error: "This booking was cancelled", status: 400 };
  }

  const ref = payload.data?.reference ?? reference.trim();
  return { ok: true, reference: ref };
}
