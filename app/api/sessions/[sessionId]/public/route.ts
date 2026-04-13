import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

import { captureApiError } from "@/lib/sentry/capture";
type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;

    const session = await prisma.therapySession.findUnique({
      where: { id: sessionId },
      include: {
        therapist: { include: { profile: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        therapistName: therapistPublicLabel(session.therapist.profile.fullName),
        therapistPhoto:
          session.therapist.profilePhoto ?? "/Ealho-logo.png",
      },
    });
  } catch (e) {
    console.error("session public:", e);
    captureApiError(e, { route: "/sessions/[sessionId]/public" });
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 },
    );
  }
}
