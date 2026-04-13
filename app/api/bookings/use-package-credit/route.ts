import { NextResponse } from "next/server";
import { z } from "zod";

import { getAvailableSlots } from "@/lib/availability/slots";
import { finalizeTherapyPaymentWithPackageCredit } from "@/lib/payment/finalize-therapy-payment";
import { sendTherapyBookingPaidNotifications } from "@/lib/payment/send-therapy-booking-paid-notifications";
import { getPatientByProfileId } from "@/lib/queries/patient";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { watDayStart } from "@/lib/wat-datetime";

import { captureApiError } from "@/lib/sentry/capture";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const bodySchema = z
  .object({
    packageId: z.string().uuid(),
    therapistId: z.string().uuid(),
    date: z.string().regex(DATE_RE),
    time: z.string().regex(TIME_RE),
    sessionType: z.enum(["intake", "followup"]).optional(),
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { packageId, therapistId, date, time, sessionType, consentTimestamp } = parsed.data;
    const patient = await getPatientByProfileId(user.id);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient profile not found" },
        { status: 403 },
      );
    }

    const pkg = await prisma.therapySessionPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg || pkg.patientId !== patient.id) {
      return NextResponse.json({ success: false, error: "Package not found" }, { status: 404 });
    }
    if (pkg.therapistId !== therapistId) {
      return NextResponse.json(
        { success: false, error: "Package therapist mismatch" },
        { status: 400 },
      );
    }
    if (pkg.status !== "active") {
      return NextResponse.json({ success: false, error: "Package is not active" }, { status: 400 });
    }
    if (pkg.expiresAt && pkg.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "Package has expired" }, { status: 400 });
    }
    if (pkg.remainingSessions <= 0) {
      return NextResponse.json({ success: false, error: "No package sessions left" }, { status: 400 });
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
      return NextResponse.json({ success: false, error: "Therapist not found" }, { status: 404 });
    }

    const [h, m] = time.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + therapist.sessionDuration;
    const endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;

    const booking = await prisma.therapyBooking.create({
      data: {
        therapistId,
        patientId: patient.id,
        date: watDayStart(date),
        startTime: time,
        endTime,
        sessionType: sessionType ?? "followup",
        consentConfirmed: true,
        consentTimestamp: new Date(consentTimestamp),
        status: "pending",
        paymentStatus: "pending",
      },
    });

    const out = await finalizeTherapyPaymentWithPackageCredit({
      bookingId: booking.id,
      packageId,
    });
    if (out.shouldSendConfirmationEmail) {
      await sendTherapyBookingPaidNotifications(out.booking);
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        sessionId: out.sessionId,
        packageExhausted: out.packageExhausted,
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("bookings/use-package-credit POST:", e);
    captureApiError(e, { route: "/bookings/use-package-credit" });
    return NextResponse.json(
      { success: false, error: "Failed to book with package credit" },
      { status: 500 },
    );
  }
}
