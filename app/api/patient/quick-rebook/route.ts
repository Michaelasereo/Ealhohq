import { NextResponse } from "next/server";

import { collectNextAvailableSlots } from "@/lib/availability/next-slots";
import { enrichSlotsForQuickRebook } from "@/lib/booking/quick-rebook-display";
import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { addWatDays, watTodayDateString } from "@/lib/wat-datetime";

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

    const body = (await req.json()) as { therapistId?: string };
    if (typeof body.therapistId !== "string" || !body.therapistId.trim()) {
      return NextResponse.json(
        { success: false, error: "therapistId required" },
        { status: 400 },
      );
    }
    const therapistId = body.therapistId.trim();

    const patient = await getPatientByProfileId(user.id);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Client profile not found" },
        { status: 403 },
      );
    }

    const completedCount = await prisma.therapySession.count({
      where: {
        patientId: patient.id,
        therapistId,
        status: "completed",
      },
    });

    if (completedCount < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "You need at least one completed session with this therapist",
        },
        { status: 403 },
      );
    }

    const therapist = await prisma.therapyTherapist.findFirst({
      where: { id: therapistId, status: "approved" },
      include: { profile: true },
    });
    if (!therapist) {
      return NextResponse.json(
        { success: false, error: "Therapist not found" },
        { status: 404 },
      );
    }

    const startYmd = addWatDays(watTodayDateString(), 1);
    const rawSlots = await collectNextAvailableSlots(therapistId, 5, startYmd);
    const nextAvailableSlots = enrichSlotsForQuickRebook(rawSlots);

    const sessionType = completedCount >= 1 ? "followup" : "intake";

    return NextResponse.json({
      success: true,
      data: {
        therapist: {
          id: therapist.id,
          name: therapistPublicLabel(therapist.profile.fullName),
          photo: therapist.profilePhoto ?? "/Ealho-logo.png",
          sessionRate: Math.round(Number(therapist.sessionRate)),
          sessionDuration: therapist.sessionDuration,
        },
        nextAvailableSlots,
        sessionType,
        sessionCount: completedCount,
      },
    });
  } catch (e) {
    console.error("client quick-rebook POST:", e);
    return NextResponse.json(
      { success: false, error: "Failed to load quick rebook" },
      { status: 500 },
    );
  }
}
