import { NextResponse } from "next/server";
import { z } from "zod";

import { ensurePendingBookingForRebookRequest } from "@/lib/rebooking/ensure-pending-booking";

import { captureApiError } from "@/lib/sentry/capture";
const schema = z
  .object({
    requestId: z.string().uuid(),
    consentConfirmed: z.literal(true),
    consentTimestamp: z.string().optional(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { requestId, consentTimestamp } = parsed.data;
    try {
      const { bookingId, patientEmail } =
        await ensurePendingBookingForRebookRequest(
          requestId,
          consentTimestamp ? new Date(consentTimestamp) : new Date(),
        );
      return NextResponse.json({
        success: true,
        data: { bookingId, email: patientEmail },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "INVALID_REQUEST") {
        return NextResponse.json(
          { error: "Invalid or expired invitation" },
          { status: 400 },
        );
      }
      if (msg === "ALREADY_CONFIRMED") {
        return NextResponse.json(
          { error: "This invitation was already confirmed" },
          { status: 400 },
        );
      }
      throw e;
    }
  } catch (e) {
    console.error("rebook prepare-payment:", e);
    captureApiError(e, { route: "/rebook/prepare-payment" });
    return NextResponse.json(
      { error: "Failed to prepare payment" },
      { status: 500 },
    );
  }
}
