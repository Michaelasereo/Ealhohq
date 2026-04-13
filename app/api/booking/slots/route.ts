import { NextResponse } from "next/server";

import { getAvailableSlots } from "@/lib/availability/slots";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const therapistId = searchParams.get("therapistId")?.trim();
    const date = searchParams.get("date")?.trim();
    if (!therapistId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "therapistId and date (YYYY-MM-DD) required" },
        { status: 400 },
      );
    }
    const slots = await getAvailableSlots(therapistId, date);
    return NextResponse.json({ success: true, data: slots });
  } catch (e) {
    console.error("booking/slots GET:", e);
    captureApiError(e, { route: "/booking/slots" });
    return NextResponse.json(
      { success: false, error: "Failed to load slots" },
      { status: 500 },
    );
  }
}
