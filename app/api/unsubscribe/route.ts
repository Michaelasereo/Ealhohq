import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    await prisma.subscriber.updateMany({
      where: { email: email.toLowerCase().trim() },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("unsubscribe error", error);
    captureApiError(error, { route: "/unsubscribe" });
    return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
  }
}
