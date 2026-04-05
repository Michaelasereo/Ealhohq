import { NextResponse } from "next/server";

import { recordConsentRecords } from "@/lib/consents/record-consent-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      userId?: string | null;
      bookingId?: string | null;
      consentTypes?: string[];
    };

    const consentTypes = Array.isArray(body.consentTypes)
      ? body.consentTypes.filter((t) => typeof t === "string" && t.trim())
      : [];

    if (consentTypes.length === 0) {
      return NextResponse.json(
        { error: "consentTypes required" },
        { status: 400 },
      );
    }

    await recordConsentRecords({
      userId: body.userId ?? null,
      bookingId: body.bookingId ?? null,
      consentTypes,
      req,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("consent POST:", e);
    return NextResponse.json(
      { error: "Failed to record consent" },
      { status: 500 },
    );
  }
}
