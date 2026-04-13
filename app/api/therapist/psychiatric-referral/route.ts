import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const bodySchema = z.object({
  therapySessionId: z.string().uuid(),
  clinicalReason: z.string().min(50).max(2000),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const session = await prisma.therapySession.findFirst({
      where: {
        id: parsed.data.therapySessionId,
        therapistId: therapist.id,
      },
      include: {
        booking: { select: { patientId: true } },
      },
    });

    if (!session?.booking?.patientId) {
      return NextResponse.json(
        { success: false, error: "Session not found or has no registered patient" },
        { status: 404 },
      );
    }

    const existing = await prisma.psychiatricReferral.findUnique({
      where: { therapySessionId: session.id },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Referral already submitted for this session" },
        { status: 409 },
      );
    }

    const referral = await prisma.psychiatricReferral.create({
      data: {
        therapistId: therapist.id,
        patientId: session.booking.patientId,
        therapySessionId: session.id,
        clinicalReason: parsed.data.clinicalReason.trim(),
        status: "flagged",
      },
    });

    await prisma.adminNotification.create({
      data: {
        id: randomUUID(),
        type: "psychiatric_referral",
        title: "Psychiatric referral submitted",
        message: `A therapist flagged a client for psychiatric assessment (referral ${referral.id.slice(0, 8)}…).`,
        resourceId: referral.id,
        resourceType: "psychiatric_referral",
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: referral.id, status: referral.status },
    });
  } catch (e) {
    console.error("therapist/psychiatric-referral POST:", e);
    captureApiError(e, { route: "/therapist/psychiatric-referral" });
    return NextResponse.json(
      { success: false, error: "Failed to submit referral" },
      { status: 500 },
    );
  }
}
