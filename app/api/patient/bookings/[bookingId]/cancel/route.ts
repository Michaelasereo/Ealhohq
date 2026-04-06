import { NextResponse } from "next/server";

import { performSessionCancellation } from "@/lib/cancellation/perform-cancellation";
import { sendSessionCancelledWhatsApp } from "@/lib/cancellation/send-cancelled-whatsapp";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ bookingId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  return handleCancel(ctx);
}

export async function PATCH(_req: Request, ctx: Ctx) {
  return handleCancel(ctx);
}

async function handleCancel(ctx: Ctx) {
  try {
    const { bookingId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await performSessionCancellation({
      bookingId,
      cancelledBy: "client",
      patientProfileId: user.id,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    sendSessionCancelledWhatsApp(bookingId);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("cancel booking:", e);
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 },
    );
  }
}
