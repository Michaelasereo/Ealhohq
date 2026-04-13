import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { PLATFORM_PSYCHIATRY_THERAPIST_ID } from "@/lib/constants/platform-psychiatry";
import {
  psychPatientInviteEmailHtml,
  psychPsychiatristBookingEmailHtml,
} from "@/lib/emails/psychiatric-notifications";
import { endTimeForSlot } from "@/lib/psychiatry/slots-for-date";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { prisma } from "@/lib/prisma/client";
import { watDayStart } from "@/lib/wat-datetime";

import { captureApiError } from "@/lib/sentry/capture";
const bodySchema = z.object({
  psychiatristId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notifyEmail: z.boolean().optional(),
  notifyWhatsApp: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { id: referralId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const notifyEmail = parsed.data.notifyEmail ?? true;
  const notifyWhatsApp = parsed.data.notifyWhatsApp ?? true;

  try {
    const referral = await prisma.psychiatricReferral.findUnique({
      where: { id: referralId },
      include: {
        therapist: { include: { profile: true } },
        patient: true,
      },
    });

    if (!referral) {
      return NextResponse.json(
        { success: false, error: "Referral not found" },
        { status: 404 },
      );
    }

    if (referral.status !== "flagged") {
      return NextResponse.json(
        { success: false, error: "Referral is not awaiting booking" },
        { status: 400 },
      );
    }

    if (referral.therapyBookingId) {
      return NextResponse.json(
        { success: false, error: "Referral already has a booking" },
        { status: 409 },
      );
    }

    const psychiatrist = await prisma.psychiatrist.findFirst({
      where: { id: parsed.data.psychiatristId, isActive: true },
    });
    if (!psychiatrist) {
      return NextResponse.json(
        { success: false, error: "Psychiatrist not found" },
        { status: 404 },
      );
    }

    const duration = psychiatrist.sessionDuration ?? 60;
    const endTime = endTimeForSlot(parsed.data.startTime, duration);
    const dateObj = watDayStart(parsed.data.date);
    const channel = `psych_${referralId.replace(/-/g, "").slice(0, 12)}`;

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.therapyBooking.create({
        data: {
          therapistId: PLATFORM_PSYCHIATRY_THERAPIST_ID,
          patientId: referral.patientId,
          date: dateObj,
          startTime: parsed.data.startTime,
          endTime,
          sessionType: "psychiatric_assessment",
          status: "pending",
          paymentStatus: "pending",
          consentConfirmed: true,
          consentTimestamp: new Date(),
          agoraRoomId: channel,
        },
      });

      const psychSession = await tx.psychiatricSession.create({
        data: {
          id: randomUUID(),
          bookingId: booking.id,
          psychiatristId: psychiatrist.id,
          patientId: referral.patientId,
          referralId: referral.id,
          status: "scheduled",
          pharmacyPartnerId: null,
        },
      });

      await tx.psychiatricInvitation.create({
        data: {
          id: randomUUID(),
          psychiatricSessionId: psychSession.id,
          patientId: referral.patientId,
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.psychiatricReferral.update({
        where: { id: referral.id },
        data: {
          status: "booked",
          therapyBookingId: booking.id,
        },
      });

      return { booking, psychSession };
    });

    const dateLabel = new Intl.DateTimeFormat("en-NG", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Africa/Lagos",
    }).format(dateObj);

    const [hh, mm] = parsed.data.startTime.split(":").map(Number);
    const period = hh >= 12 ? "PM" : "AM";
    const hour12 = hh % 12 || 12;
    const timeLabel = `${hour12}:${String(mm).padStart(2, "0")} ${period}`;

    if (notifyEmail && referral.patient.email) {
      void sendTransactionalEmail({
        to: referral.patient.email,
        subject: "Psychiatric assessment — action needed",
        html: psychPatientInviteEmailHtml({
          psychiatristName: psychiatrist.name,
          dateLabel,
          timeLabel,
          durationMins: duration,
        }),
      }).catch(() => {});
    }

    if (notifyWhatsApp && referral.patient.phone) {
      void sendWhatsApp({
        to: referral.patient.phone,
        body: `Hi — your therapist recommended a psychiatric assessment with ${psychiatrist.name} on ${dateLabel} at ${timeLabel} WAT. Open your Ealho dashboard to accept or decline.`,
      }).catch(() => {});
    }

    if (notifyEmail && psychiatrist.email) {
      void sendTransactionalEmail({
        to: psychiatrist.email,
        subject: `Psychiatric assessment scheduled — ${dateLabel}`,
        html: psychPsychiatristBookingEmailHtml({
          psychiatristName: psychiatrist.name,
          dateLabel,
          timeLabel,
          clinicalReason: referral.clinicalReason,
          therapistName: referral.therapist.profile.fullName,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingId: result.booking.id,
        psychiatricSessionId: result.psychSession.id,
      },
    });
  } catch (e) {
    console.error("admin/psychiatric-referrals/[id]/book POST:", e);
    captureApiError(e, { route: "/admin/psychiatric-referrals/[id]/book" });
    return NextResponse.json(
      { success: false, error: "Failed to book session" },
      { status: 500 },
    );
  }
}
