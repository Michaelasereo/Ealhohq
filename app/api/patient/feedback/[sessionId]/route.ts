import { NextResponse } from "next/server";
import { z } from "zod";

import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await getPatientByProfileId(user.id);
    if (!patient) {
      return NextResponse.json({
        success: true,
        data: {
          submitted: false,
          needsProfile: true as const,
          therapistName: "",
          therapistPhoto: "",
        },
      });
    }

    const session = await prisma.therapySession.findFirst({
      where: {
        id: sessionId,
        patientId: patient.id,
      },
      include: {
        feedbacks: { select: { id: true }, take: 1 },
        therapist: { include: { profile: { select: { fullName: true } } } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        submitted: session.feedbacks.length > 0,
        needsProfile: false as const,
        therapistName: session.therapist.profile.fullName,
        therapistPhoto:
          session.therapist.profilePhoto ?? "/Ealho-logo.png",
      },
    });
  } catch (e) {
    console.error("patient feedback GET:", e);
    return NextResponse.json(
      { error: "Failed to check feedback" },
      { status: 500 },
    );
  }
}

const postSchema = z.object({
  rating: z.number().int().min(1).max(5),
  mood: z.string().max(8).optional().nullable(),
  comment: z.string().max(500).optional().nullable(),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await getPatientByProfileId(user.id);
    if (!patient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const session = await prisma.therapySession.findFirst({
      where: {
        id: sessionId,
        patientId: patient.id,
      },
      include: { feedbacks: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "completed") {
      return NextResponse.json(
        { error: "Feedback is only available after the session has ended" },
        { status: 400 },
      );
    }

    if (session.feedbacks.length > 0) {
      return NextResponse.json(
        { error: "Feedback already submitted" },
        { status: 409 },
      );
    }

    const { rating, mood, comment } = parsed.data;
    await prisma.therapyFeedback.create({
      data: {
        sessionId: session.id,
        rating,
        mood: mood?.trim() || null,
        comment: comment?.trim() || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("patient feedback POST:", e);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 },
    );
  }
}
