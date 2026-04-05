import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import {
  formatBookingDateLong,
  formatSlotTo12h,
} from "@/lib/booking/display-wat";
import { sessionJoinUrl } from "@/lib/reminders/format-session-link";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { templates } from "@/lib/whatsapp/templates";
import { bookingDateStartToIso, formatWAT, watDayStart } from "@/lib/wat-datetime";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.therapyBooking.findMany({
      take: 50,
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      include: {
        therapist: { include: { profile: true } },
        patient: true,
        session: { select: { id: true, status: true } },
      },
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    console.error("admin sessions GET:", e);
    return NextResponse.json(
      { error: "Failed to load sessions" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      therapistId?: string;
      patientId?: string | null;
      guestName?: string | null;
      guestEmail?: string | null;
      guestPhone?: string | null;
      date?: string;
      startTime?: string;
      sessionType?: string;
      paymentType?: string;
      paymentReference?: string | null;
      isAnonymous?: boolean;
      sendConfirmation?: boolean;
      manualTime?: boolean;
    };

    const therapistId = typeof body.therapistId === "string" ? body.therapistId : "";
    const dateStr = typeof body.date === "string" ? body.date.trim() : "";
    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
    const sessionType =
      body.sessionType === "intake" || body.sessionType === "followup"
        ? body.sessionType
        : "followup";
    const paymentType = body.paymentType ?? "waived";
    const isAnonymous = Boolean(body.isAnonymous);
    const sendConfirmation = body.sendConfirmation !== false;
    const guestPhoneFromBody =
      typeof body.guestPhone === "string" ? body.guestPhone.trim() : "";

    if (!therapistId || !DATE_RE.test(dateStr) || !TIME_RE.test(startTime)) {
      return NextResponse.json(
        { error: "therapistId, date (YYYY-MM-DD), and startTime (HH:MM) are required" },
        { status: 400 },
      );
    }

    const therapist = await prisma.therapyTherapist.findFirst({
      where: { id: therapistId, status: "approved" },
      include: { profile: true },
    });
    if (!therapist) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    }

    let resolvedPatientId: string | null =
      typeof body.patientId === "string" && body.patientId ? body.patientId : null;

    if (!resolvedPatientId) {
      const gName = typeof body.guestName === "string" ? body.guestName.trim() : "";
      const gEmail = typeof body.guestEmail === "string" ? body.guestEmail.trim() : "";
      const gPhone = typeof body.guestPhone === "string" ? body.guestPhone.trim() : "";
      if (!gName || !gEmail) {
        return NextResponse.json(
          { error: "Guest name and email are required when no patient is selected" },
          { status: 400 },
        );
      }
      const displayName = isAnonymous ? gName : gName;
      const guest = await prisma.therapyPatient.create({
        data: {
          fullName: displayName,
          email: gEmail,
          phone: gPhone || "",
        },
      });
      resolvedPatientId = guest.id;
      await prisma.therapyCredit.upsert({
        where: { patientId: guest.id },
        create: { patientId: guest.id, balance: 0, tier: "bronze" },
        update: {},
      });
    }

    const patientRow = await prisma.therapyPatient.findUnique({
      where: { id: resolvedPatientId! },
    });
    if (!patientRow) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [h, m] = startTime.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + therapist.sessionDuration;
    const endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;

    let paystackReference: string | null = null;
    let paidWithCredits = false;

    if (paymentType === "waived") {
      paystackReference = `admin_waived_${Date.now()}`;
    } else if (paymentType === "offline") {
      const ref =
        typeof body.paymentReference === "string" && body.paymentReference.trim()
          ? body.paymentReference.trim()
          : `admin_offline_${Date.now()}`;
      paystackReference = ref;
    } else if (paymentType === "credits") {
      paidWithCredits = true;
      await prisma.therapyCredit.upsert({
        where: { patientId: resolvedPatientId! },
        create: { patientId: resolvedPatientId!, balance: 0, tier: "bronze" },
        update: {},
      });
      const credit = await prisma.therapyCredit.findUnique({
        where: { patientId: resolvedPatientId! },
      });
      const balance = credit?.balance ?? 0;
      if (balance < 1) {
        return NextResponse.json(
          { error: "Patient has no credits available" },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json({ error: "Invalid paymentType" }, { status: 400 });
    }

    const day = watDayStart(dateStr);
    const aliasSource =
      typeof body.guestName === "string" && body.guestName.trim()
        ? body.guestName.trim()
        : patientRow.fullName;

    const booking = await prisma.therapyBooking.create({
      data: {
        therapistId,
        patientId: resolvedPatientId,
        guestName: null,
        guestEmail: null,
        guestPhone: null,
        isAnonymous,
        clientAlias: isAnonymous ? aliasSource : null,
        date: day,
        startTime,
        endTime,
        sessionType,
        status: "confirmed",
        paymentStatus: "paid",
        paystackReference:
          paymentType === "credits" ? "credit:pending" : paystackReference,
        consentConfirmed: true,
        consentTimestamp: new Date(),
        paidWithCredits,
      },
    });

    if (paymentType === "credits") {
      await prisma.therapyBooking.update({
        where: { id: booking.id },
        data: { paystackReference: `credit:${booking.id}` },
      });
      await prisma.$transaction([
        prisma.therapyCredit.update({
          where: { patientId: resolvedPatientId! },
          data: { balance: { decrement: 1 } },
        }),
        prisma.therapyCreditTransaction.create({
          data: {
            patientId: resolvedPatientId!,
            amount: -1,
            type: "session",
            reference: booking.id,
          },
        }),
      ]);
    }

    const previousSessions = await prisma.therapySession.count({
      where: {
        therapistId,
        patientId: resolvedPatientId!,
      },
    });

    await prisma.therapySession.create({
      data: {
        bookingId: booking.id,
        therapistId,
        patientId: resolvedPatientId!,
        sessionNumber: previousSessions + 1,
        format: "telehealth",
        status: "scheduled",
      },
    });

    const recipientEmail = patientRow.email.trim();
    const phoneForConfirmation =
      guestPhoneFromBody || patientRow.phone?.trim() || "";

    if (sendConfirmation && recipientEmail) {
      const link = sessionJoinUrl(booking.id);
      const iso = bookingDateStartToIso(booking.date, booking.startTime);
      const dateLine = new Intl.DateTimeFormat("en-NG", {
        dateStyle: "full",
        timeZone: "Africa/Lagos",
      }).format(new Date(iso));
      const timeWat = formatWAT(iso);
      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #292612;">ealho</h1>
          <h2 style="font-size: 20px; font-weight: 600; color: #111; margin-bottom: 8px;">Your session is confirmed</h2>
          <p style="color: #555; line-height: 1.6; margin-bottom: 24px;">A therapy session has been scheduled for you.</p>
          <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; color: #333;"><strong>Date:</strong> ${dateLine}</p>
            <p style="margin: 0 0 8px; color: #333;"><strong>Time:</strong> ${timeWat} WAT</p>
            <p style="margin: 0; color: #333;"><strong>Duration:</strong> ${therapist.sessionDuration} minutes</p>
          </div>
          <a href="${link}" style="display: block; background: #292612; color: #d6eae1; text-align: center; padding: 14px; border-radius: 10px; text-decoration: none; font-weight: 600;">Join Session →</a>
        </div>`;
      await sendTransactionalEmail({
        to: recipientEmail,
        subject: "Your therapy session has been scheduled",
        html,
      });
    }

    if (sendConfirmation && phoneForConfirmation) {
      const link = sessionJoinUrl(booking.id);
      const guestNameFromBody =
        typeof body.guestName === "string" ? body.guestName.trim() : "";
      void sendWhatsApp({
        to: phoneForConfirmation,
        body: templates.bookingConfirmed({
          patientName: isAnonymous
            ? "there"
            : guestNameFromBody || patientRow.fullName || "Patient",
          therapistName: therapist.profile.fullName,
          date: formatBookingDateLong(day),
          time: formatSlotTo12h(startTime),
          duration: therapist.sessionDuration,
          sessionLink: link,
          isAnonymous,
        }),
      }).catch((err) => console.error("WhatsApp admin session notify failed:", err));
    }

    return NextResponse.json({
      success: true,
      data: { bookingId: booking.id },
    });
  } catch (e) {
    console.error("admin sessions POST:", e);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}
