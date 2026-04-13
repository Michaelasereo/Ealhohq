import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { DEFAULT_THERAPIST_PERCENT } from "@/lib/defaults/earnings-split";
import { generateNoteAsync } from "@/lib/notes/generate-note";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
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

    const earningsCfg = booking
      ? await prisma.earningsConfig.findUnique({
          where: { therapistId: booking.therapistId },
        })
      : null;
    const therapistPct = earningsCfg
      ? Number(earningsCfg.therapistPercent)
      : DEFAULT_THERAPIST_PERCENT;
    const sessionRateNgn = booking
      ? Number(booking.therapist.sessionRate)
      : 0;
    const therapistShare = Math.round(((sessionRateNgn * therapistPct) / 100) * 100) / 100;
    const platformShare = Math.round((sessionRateNgn - therapistShare) * 100) / 100;

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
        therapistEarnings: new Prisma.Decimal(String(therapistShare)),
        platformEarnings: new Prisma.Decimal(String(platformShare)),
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

    if (booking.isReferral && booking.referralPartnerId) {
      const partner = await prisma.referralPartner.findUnique({
        where: { id: booking.referralPartnerId },
      });
      const patientEmail = (
        booking.guestEmail ??
        booking.patient?.email ??
        ""
      ).trim().toLowerCase();

      if (partner && patientEmail) {
        const existingEarned = await prisma.referralSession.findFirst({
          where: {
            partnerId: partner.id,
            patientEmail,
            status: { in: ["earned", "paid"] },
          },
        });

        if (!existingEarned) {
          await prisma.$transaction(
            async (tx) => {
              await tx.referralSession.create({
                data: {
                  partnerId: partner.id,
                  bookingId: booking.id,
                  patientEmail,
                  feeAmount: partner.feePerSession,
                  status: "earned",
                },
              });
              await tx.referralPartner.update({
                where: { id: partner.id },
                data: {
                  totalReferred: { increment: 1 },
                  totalEarned: { increment: partner.feePerSession },
                },
              });
            },
            { timeout: 10_000 },
          );
        }
      }
    }

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
    captureApiError(e, { route: "/session/complete" });
    return NextResponse.json(
      { success: false, error: "Failed to complete session" },
      { status: 500 },
    );
  }
}
