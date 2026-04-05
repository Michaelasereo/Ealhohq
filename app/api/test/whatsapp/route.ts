import { NextResponse } from "next/server";

import { sendWhatsApp } from "@/lib/whatsapp/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json()) as { phone?: string; message?: string };
    const phone = typeof body.phone === "string" ? body.phone : "";

    const result = await sendWhatsApp({
      to: phone,
      body: body.message ?? "Test message from Ealho Therapy 🎉",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
