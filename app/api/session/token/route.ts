import { RtcRole, RtcTokenBuilder } from "agora-token";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { canJoinSessionWindow } from "@/lib/session/join-access";

function channelFromBookingId(bookingId: string): string {
  const hex = bookingId.replace(/-/g, "").slice(0, 16);
  return `ealho_${hex}`;
}

export async function POST(req: Request) {
  try {
    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID?.trim();
    const appCertificate = process.env.AGORA_APP_CERTIFICATE?.trim();
    if (!appId || !appCertificate) {
      return NextResponse.json(
        { success: false, error: "Agora is not configured" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as { bookingId?: string };
    const bookingId = body.bookingId;
    if (typeof bookingId !== "string" || !bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const booking = await prisma.therapyBooking.findUnique({
      where: { id: bookingId },
      include: {
        therapist: { include: { profile: true } },
        patient: { select: { profileId: true } },
        session: true,
      },
    });

    if (!booking?.session) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    if (
      booking.session.status !== "scheduled" &&
      booking.session.status !== "in-progress"
    ) {
      return NextResponse.json(
        { success: false, error: "Session is not available to join" },
        { status: 400 },
      );
    }

    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { success: false, error: "Booking is not confirmed for video" },
        { status: 400 },
      );
    }

    if (
      !canJoinSessionWindow(
        booking.date,
        booking.startTime,
        booking.endTime,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Session join is only available shortly before start time",
        },
        { status: 403 },
      );
    }

    let uid: number;
    if (!user) {
      if (booking.patient?.profileId) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }
      uid = 2;
    } else {
      const therapistMatch =
        booking.therapist.profileId === user.id;
      const patientMatch = booking.patient?.profileId === user.id;
      if (therapistMatch) uid = 1;
      else if (patientMatch) uid = 2;
      else {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        );
      }
    }

    const channelName =
      booking.agoraRoomId ?? channelFromBookingId(bookingId);

    const tokenExpireSec = 7200;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      tokenExpireSec,
      tokenExpireSec,
    );

    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + tokenExpireSec;

    await prisma.therapyBooking.update({
      where: { id: bookingId },
      data: {
        agoraRoomId: channelName,
        agoraRoomToken: token,
      },
    });

    await prisma.therapySession.update({
      where: { id: booking.session.id },
      data: {
        status: "in-progress",
        startedAt: booking.session.startedAt ?? new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        appId,
        channelName,
        token,
        uid,
        expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
      },
    });
  } catch (e) {
    console.error("Token generation error:", e);
    return NextResponse.json(
      { success: false, error: "Failed to generate session token" },
      { status: 500 },
    );
  }
}
