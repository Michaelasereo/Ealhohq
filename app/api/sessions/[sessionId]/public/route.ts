import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

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
        therapistName: session.therapist.profile.fullName,
        therapistPhoto:
          session.therapist.profilePhoto ?? "/Ealho-logo.png",
      },
    });
  } catch (e) {
    console.error("session public:", e);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 },
    );
  }
}
