import { NextResponse } from "next/server";

import { getAvailableSlots } from "@/lib/availability/slots";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { watDayStart } from "@/lib/wat-datetime";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      therapistId,
      date,
      startTime,
      guestName,
      guestEmail,
      guestPhone,
      sessionType,
      consentConfirmed,
      consentTimestamp,
      patientId: bodyPatientId,
      guestBookingReason,
      isAnonymous: rawAnonymous,
    } = body as Record<string, unknown>;

    const isAnonymous = Boolean(rawAnonymous);

    if (
      typeof therapistId !== "string" ||
      typeof date !== "string" ||
      typeof startTime !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "therapistId, date, and startTime are required",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    if (!DATE_RE.test(date) || !TIME_RE.test(startTime)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Invalid date or startTime format",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isRegisteredBooking =
      typeof bodyPatientId === "string" && bodyPatientId.length > 0;

    let resolvedPatientId: string | null = isRegisteredBooking
      ? bodyPatientId
      : null;

    if (resolvedPatientId) {
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
      const owned = await prisma.therapyPatient.findFirst({
        where: { id: resolvedPatientId, profileId: user.id },
      });
      if (!owned) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Patient profile mismatch",
            meta: { timestamp: new Date().toISOString() },
          },
          { status: 403 },
        );
      }
    } else {
      const gName = typeof guestName === "string" ? guestName.trim() : "";
      const gEmail = typeof guestEmail === "string" ? guestEmail.trim() : "";
      const gPhone =
        typeof guestPhone === "string" ? guestPhone.trim() : "";

      if (!gName || !gEmail) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: isAnonymous
              ? "Alias and email are required"
              : "Guest name, email, and phone are required",
            meta: { timestamp: new Date().toISOString() },
          },
          { status: 400 },
        );
      }

      if (!isAnonymous) {
        if (!gPhone) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              error: "Guest name, email, and phone are required",
              meta: { timestamp: new Date().toISOString() },
            },
            { status: 400 },
          );
        }
      }
    }

    const available = await getAvailableSlots(therapistId, date);
    if (!available.includes(startTime)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "This slot is no longer available",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 409 },
      );
    }

    const therapist = await prisma.therapyTherapist.findFirst({
      where: { id: therapistId, status: "approved" },
    });
    if (!therapist) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Therapist not found",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }

    const [h, m] = startTime.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + therapist.sessionDuration;
    const endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;

    if (!resolvedPatientId) {
      const gName = String(guestName).trim();
      const gEmail = String(guestEmail).trim();
      const gPhoneRaw =
        typeof guestPhone === "string" ? guestPhone.trim() : "";
      const guest = await prisma.therapyPatient.create({
        data: {
          fullName: gName,
          email: gEmail,
          phone: gPhoneRaw || "",
        },
      });
      resolvedPatientId = guest.id;
    }

    const st =
      sessionType === "intake" || sessionType === "followup"
        ? sessionType
        : "followup";

    const reasonStr =
      typeof guestBookingReason === "string" && guestBookingReason.trim()
        ? guestBookingReason.trim().slice(0, 500)
        : null;

    const trimmedGuestName = String(guestName ?? "").trim();
    const trimmedGuestEmail = String(guestEmail ?? "").trim();
    const trimmedGuestPhone =
      typeof guestPhone === "string" ? guestPhone.trim() : "";

    const booking = await prisma.therapyBooking.create({
      data: {
        therapistId,
        patientId: resolvedPatientId,
        guestName: isRegisteredBooking ? null : trimmedGuestName,
        guestEmail: isRegisteredBooking ? null : trimmedGuestEmail,
        guestPhone: isRegisteredBooking
          ? null
          : trimmedGuestPhone || null,
        guestBookingReason: isRegisteredBooking ? null : reasonStr,
        isAnonymous: isRegisteredBooking ? false : isAnonymous,
        clientAlias:
          isRegisteredBooking || !isAnonymous
            ? null
            : trimmedGuestName || null,
        date: watDayStart(date),
        startTime,
        endTime,
        sessionType: st,
        consentConfirmed: Boolean(consentConfirmed),
        consentTimestamp: consentTimestamp
          ? new Date(String(consentTimestamp))
          : null,
        status: "pending",
        paymentStatus: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      data: { bookingId: booking.id },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("Booking creation error:", e);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to create booking",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
