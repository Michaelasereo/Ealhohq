import { NextResponse } from "next/server";

import { performSessionCancellation } from "@/lib/cancellation/perform-cancellation";
import { sendSessionCancelledWhatsApp } from "@/lib/cancellation/send-cancelled-whatsapp";
import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";

import { captureApiError } from "@/lib/sentry/capture";
type Ctx = { params: Promise<{ bookingId: string }> };

/**
 * @deprecated Prefer POST /api/sessions/cancel with cancelledBy: "therapist".
 * Delegates to the same server-side cancellation policy (refunds, credits, session row).
 */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { bookingId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      reason?: string;
    };

    const result = await performSessionCancellation({
      bookingId,
      cancelledBy: "therapist",
      reason: body.reason ?? null,
      therapistProfileId: user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    sendSessionCancelledWhatsApp(bookingId);

    return NextResponse.json({
      success: true,
      data: {
        refundType: result.policy.refundType,
        refundCredits: result.policy.refundCredits,
        bonusCredits: result.policy.bonusCredits,
        message: result.policy.message,
      },
    });
  } catch (e) {
    console.error("therapist booking cancel PATCH:", e);
    captureApiError(e, { route: "/therapist/bookings/[bookingId]/cancel" });
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
