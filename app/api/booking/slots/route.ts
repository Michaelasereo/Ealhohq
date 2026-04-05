import { NextResponse } from "next/server";

import { getAvailableSlots } from "@/lib/availability/slots";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const therapistId = searchParams.get("therapistId");
    const dateStr = searchParams.get("date");

    if (!therapistId || !dateStr) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "therapistId and date required",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    if (!DATE_RE.test(dateStr)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "date must be YYYY-MM-DD",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    const slots = await getAvailableSlots(therapistId, dateStr);

    return NextResponse.json({
      success: true,
      data: slots,
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to fetch slots",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
