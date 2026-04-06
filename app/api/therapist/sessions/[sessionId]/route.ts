import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { bookingDateStartToIso } from "@/lib/wat-datetime";
import { getClientId, getDisplayName } from "@/lib/utils/patient-display";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { sessionId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Unauthorized",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 401 },
      );
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Forbidden",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 403 },
      );
    }

    const session = await prisma.therapySession.findFirst({
      where: { id: sessionId, therapistId: therapist.id },
      include: {
        booking: {
          include: {
            patient: { include: { profile: true } },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Session not found",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }

    const p = session.booking.patient;
    const guest = session.booking;
    const patientId = p?.id ?? guest.patientId ?? "";
    const isAnonymous = guest.isAnonymous;
    const fullName = getDisplayName({
      isAnonymous,
      clientAlias: guest.clientAlias,
      guestName: guest.guestName,
      patient: p
        ? {
            fullName:
              p.profile?.fullName ?? p.fullName,
          }
        : null,
    });
    const email = isAnonymous ? "" : p?.email ?? guest.guestEmail ?? "";
    const phone = isAnonymous ? "" : p?.phone ?? guest.guestPhone ?? "";

    const dateIso = bookingDateStartToIso(
      session.booking.date,
      session.booking.startTime,
    );

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        therapistId: therapist.id,
        bookingId: session.booking.id,
        dateIso,
        startTime: session.booking.startTime,
        endTime: session.booking.endTime,
        durationMins:
          session.durationMinutes ?? therapist.sessionDuration,
        type:
          session.booking.sessionType === "intake" ? "intake" : "follow-up",
        sessionStatus: session.status,
        bookingStatus: session.booking.status,
        notesGenerated: session.notesGenerated,
        sessionNumber: session.sessionNumber,
        patient: {
          id: patientId,
          fullName,
          email,
          phone,
        },
        booking: {
          id: guest.id,
          isAnonymous,
          clientId: getClientId(guest.id),
          professionalType: guest.professionalType,
        },
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("therapist session GET:", e);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to load session",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
