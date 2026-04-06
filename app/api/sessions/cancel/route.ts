import { NextResponse } from "next/server";
import { z } from "zod";

import { performSessionCancellation } from "@/lib/cancellation/perform-cancellation";
import { sendSessionCancelledWhatsApp } from "@/lib/cancellation/send-cancelled-whatsapp";
import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z
  .object({
    bookingId: z.string().uuid(),
    reason: z.string().max(2000).optional().nullable(),
    cancelledBy: z.enum(["client", "therapist", "admin", "platform"]).optional(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { bookingId, reason } = parsed.data;
    let cancelledBy = parsed.data.cancelledBy;
    const role = user.app_metadata?.role as string | undefined;
    const admin = await isAdminUser(user);

    if (!cancelledBy) {
      if (role === "therapist") cancelledBy = "therapist";
      else if (admin) cancelledBy = "admin";
      else cancelledBy = "client";
    }

    if ((cancelledBy === "admin" || cancelledBy === "platform") && !admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (cancelledBy === "therapist" && role !== "therapist" && !admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (cancelledBy === "client" && role !== "patient" && !admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await performSessionCancellation({
      bookingId,
      cancelledBy,
      reason,
      patientProfileId: role === "patient" ? user.id : undefined,
      therapistProfileId: role === "therapist" ? user.id : undefined,
      isAdmin: admin,
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
    console.error("sessions/cancel POST:", e);
    return NextResponse.json(
      { success: false, error: "Failed to cancel session" },
      { status: 500 },
    );
  }
}
