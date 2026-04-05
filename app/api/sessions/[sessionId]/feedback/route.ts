import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

type Ctx = { params: Promise<{ sessionId: string }> };

/**
 * Public: no auth required (guests may submit). No clinical data returned.
 */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const body = (await req.json()) as {
      rating?: number;
      mood?: string;
      comment?: string;
    };

    if (typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        {
          success: false,
          error: "rating 1–5 required",
        },
        { status: 400 },
      );
    }

    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      include: { feedbacks: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    if (session.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          error: "Feedback is only available after the session has ended",
        },
        { status: 400 },
      );
    }

    if (session.feedbacks.length > 0) {
      return NextResponse.json(
        { success: false, error: "Feedback already submitted" },
        { status: 409 },
      );
    }

    await prisma.therapyFeedback.create({
      data: {
        sessionId: session.id,
        rating: body.rating,
        mood: typeof body.mood === "string" ? body.mood : null,
        comment:
          typeof body.comment === "string" && body.comment.trim()
            ? body.comment.trim()
            : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("feedback POST:", e);
    return NextResponse.json(
      { success: false, error: "Failed to save feedback" },
      { status: 500 },
    );
  }
}
