import { NextResponse } from "next/server";

import { generateNoteAsync } from "@/lib/notes/generate-note";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await req.json()) as {
      bookingId?: string;
      transcript?: string;
      guestEmail?: string;
    };

    const bookingId = body.bookingId;
    const transcript =
      typeof body.transcript === "string"
        ? body.transcript
        : "[No transcript available — notes will need manual entry]";

    if (typeof bookingId !== "string" || !bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 },
      );
    }

    const booking = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: {
        therapist: { include: { profile: true } },
        patient: true,
        session: true,
      },
    });

    if (!booking?.session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    const therapistOk =
      Boolean(user) && booking.therapist.profileId === user!.id;
    const patientOk =
      Boolean(user) && booking.patient?.profileId === user!.id;
    const guestOk =
      !user &&
      booking.patient?.profileId == null &&
      typeof body.guestEmail === "string" &&
      booking.guestEmail &&
      body.guestEmail.trim().toLowerCase() ===
        booking.guestEmail.trim().toLowerCase();

    if (!therapistOk && !patientOk && !guestOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = booking.session.id;

    await prisma.therapySession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        endedAt: new Date(),
        agoraTranscript: transcript,
        durationMinutes: booking.session.startedAt
          ? Math.max(
              1,
              Math.round(
                (Date.now() - booking.session.startedAt.getTime()) / 60_000,
              ),
            )
          : undefined,
      },
    });

    await prisma.therapyBooking.update({
      where: { id: bookingId },
      data: { status: "completed" },
    });

    void generateNoteAsync(
      sessionId,
      transcript,
      booking.session.sessionNumber,
      {
        isAnonymous: booking.isAnonymous,
        bookingId: booking.id,
      },
    ).catch((err) => console.error("Note generation failed:", err));

    return NextResponse.json({
      success: true,
      data: { sessionId },
    });
  } catch (e) {
    console.error("Session complete error:", e);
    return NextResponse.json(
      { success: false, error: "Failed to complete session" },
      { status: 500 },
    );
  }
}
