import { NextResponse } from "next/server";
import { z } from "zod";

import { getAvailableSlots } from "@/lib/availability/slots";
import {
  loadBookingForNotify,
  notifyRebookBookingConfirmed,
} from "@/lib/rebooking/notify-confirmed";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { finalizeTherapyPaymentWithCredits } from "@/lib/payment/finalize-therapy-payment";
import { getPackageOption } from "@/lib/packages/config";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { watDayStart } from "@/lib/wat-datetime";

import { captureApiError } from "@/lib/sentry/capture";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const bodySchema = z
  .object({
    therapistId: z.string().uuid(),
    date: z.string().regex(DATE_RE),
    time: z.string().regex(TIME_RE),
    sessionType: z.enum(["intake", "followup"]),
    useCredits: z.boolean(),
    packageType: z.string().optional(),
    consentConfirmed: z.literal(true),
    consentTimestamp: z.string().min(1),
  })
  .strict();

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

    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { therapistId, date, time, sessionType, useCredits, consentTimestamp, packageType: rawPackageType } =
      parsed.data;
    const packageType = getPackageOption(rawPackageType ?? "single").id;

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient profile not found" },
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
          error: "No completed sessions with this therapist",
        },
        { status: 403 },
      );
    }

    const available = await getAvailableSlots(therapistId, date);
    if (!available.includes(time)) {
      return NextResponse.json(
        { success: false, error: "This slot is no longer available" },
        { status: 409 },
      );
    }

    const therapist = await prisma.therapyTherapist.findFirst({
      where: { id: therapistId, status: "approved" },
    });
    if (!therapist) {
      return NextResponse.json(
        { success: false, error: "Therapist not found" },
        { status: 404 },
      );
    }

    const [h, m] = time.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + therapist.sessionDuration;
    const endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;

    const booking = await prisma.therapyBooking.create({
      data: {
        therapistId,
        patientId: patient.id,
        guestName: null,
        guestEmail: null,
        guestPhone: null,
        guestBookingReason: null,
        date: watDayStart(date),
        startTime: time,
        endTime,
        sessionType,
        consentConfirmed: true,
        consentTimestamp: new Date(consentTimestamp),
        status: "pending",
        paymentStatus: "pending",
      },
    });

    if (useCredits) {
      try {
        const { shouldSendConfirmationEmail } =
          await finalizeTherapyPaymentWithCredits(booking.id);
        const full = await loadBookingForNotify(booking.id);
        if (full) {
          await notifyRebookBookingConfirmed(full, {
            sendEmail: shouldSendConfirmationEmail,
          });
        }
        return NextResponse.json({
          success: true,
          data: { bookingId: booking.id, paidWithCredits: true, packageType: "single" },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "Insufficient credits") {
          await prisma.therapyBooking.delete({ where: { id: booking.id } }).catch(() => {});
          return NextResponse.json(
            { success: false, error: "Insufficient credits" },
            { status: 400 },
          );
        }
        console.error("create-registered credits:", e);
    captureApiError(e, { route: "/patient/bookings/create-registered" });
        return NextResponse.json(
          { success: false, error: "Could not complete booking with credits" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: { bookingId: booking.id, paidWithCredits: false, packageType },
    });
  } catch (e) {
    console.error("client bookings/create-registered POST:", e);
    captureApiError(e, { route: "/patient/bookings/create-registered" });
    return NextResponse.json(
      { success: false, error: "Failed to create booking" },
      { status: 500 },
    );
  }
}
