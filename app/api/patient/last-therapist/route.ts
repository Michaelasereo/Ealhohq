import { NextResponse } from "next/server";

import { collectNextAvailableSlots } from "@/lib/availability/next-slots";
import { enrichSlotsForQuickRebook } from "@/lib/booking/quick-rebook-display";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { addWatDays, watTodayDateString } from "@/lib/wat-datetime";

export async function GET() {
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

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
    if (!patient) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const lastSession = await prisma.therapySession.findFirst({
      where: {
        patientId: patient.id,
        status: "completed",
      },
      orderBy: {
        booking: {
          date: "desc",
          startTime: "desc",
        },
      },
      include: {
        therapist: { include: { profile: true } },
      },
    });

    if (!lastSession) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const therapistId = lastSession.therapistId;
    const completedWithTherapist = await prisma.therapySession.count({
      where: {
        patientId: patient.id,
        therapistId,
        status: "completed",
      },
    });

    const t = lastSession.therapist;
    const startYmd = addWatDays(watTodayDateString(), 1);
    const rawSlots = await collectNextAvailableSlots(therapistId, 1, startYmd);
    const enriched = enrichSlotsForQuickRebook(rawSlots);
    const nextSlot = enriched[0] ?? null;

    return NextResponse.json({
      success: true,
      data: {
        therapist: {
          id: t.id,
          name: therapistPublicLabel(t.profile.fullName),
          photo: t.profilePhoto ?? "/Ealho-logo.png",
          sessionRate: Math.round(Number(t.sessionRate)),
          sessionDuration: t.sessionDuration,
        },
        sessionCount: completedWithTherapist,
        nextSlot,
      },
    });
  } catch (e) {
    console.error("client last-therapist GET:", e);
    return NextResponse.json(
      { success: false, error: "Failed to load" },
      { status: 500 },
    );
  }
}
