import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  finalizePsychiatricPaymentWithPartnerMonthlyCredit,
  finalizePsychiatricPaymentWithWalletCredits,
} from "@/lib/payment/finalize-therapy-payment";
import { sendTherapyBookingPaidNotifications } from "@/lib/payment/send-therapy-booking-paid-notifications";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { enforceApiRateLimit } from "@/lib/rate-limit/api";
import { captureApiError } from "@/lib/sentry/capture";
const patchSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const limited = await enforceApiRateLimit(req, "psychiatric_invitation_patch");
    if (limited) return limited;

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

    const patientRow = await ensureRegisteredPatientForUser(user);
    const patient = patientRow?.patient;
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient profile required" },
        { status: 400 },
      );
    }

    const { id: invitationId } = await ctx.params;

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const inv = await prisma.psychiatricInvitation.findFirst({
      where: {
        id: invitationId,
        patientId: patient.id,
      },
      include: {
        psychiatricSession: {
          include: {
            booking: true,
            psychiatrist: true,
          },
        },
      },
    });

    if (!inv) {
      return NextResponse.json(
        { success: false, error: "Invitation not found" },
        { status: 404 },
      );
    }

    if (inv.status !== "pending" || inv.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Invitation is no longer active" },
        { status: 400 },
      );
    }

    const booking = inv.psychiatricSession.booking;

    if (parsed.data.action === "decline") {
      await prisma.$transaction([
        prisma.psychiatricInvitation.update({
          where: { id: inv.id },
          data: { status: "declined" },
        }),
        prisma.psychiatricReferral.update({
          where: { id: inv.psychiatricSession.referralId },
          data: { status: "declined" },
        }),
        prisma.therapyBooking.update({
          where: { id: booking.id },
          data: { status: "cancelled", paymentStatus: "pending" },
        }),
      ]);

      await prisma.adminNotification.create({
        data: {
          id: randomUUID(),
          type: "psychiatric_declined",
          title: "Patient declined psychiatric assessment",
          message: `Invitation ${inv.id.slice(0, 8)}… was declined.`,
          resourceId: inv.psychiatricSession.id,
          resourceType: "psychiatric_session",
        },
      });

      return NextResponse.json({ success: true, data: { status: "declined" } });
    }

    if (booking.status !== "pending" || booking.paymentStatus !== "pending") {
      return NextResponse.json(
        { success: false, error: "Booking is not awaiting payment" },
        { status: 400 },
      );
    }

    const partner = patient.partnerClientId
      ? await prisma.partnerClient.findUnique({
          where: { id: patient.partnerClientId },
        })
      : null;

    if (
      partner &&
      partner.onboardingStatus === "active" &&
      partner.monthlyCreditsRemaining >= 2
    ) {
      try {
        const out = await finalizePsychiatricPaymentWithPartnerMonthlyCredit(booking.id);
        if (out.shouldSendConfirmationEmail) {
          void sendTherapyBookingPaidNotifications(out.booking).catch(() => {});
        }
        return NextResponse.json({
          success: true,
          data: { status: "accepted", paidVia: "partner_credits", sessionId: out.sessionId },
        });
      } catch {
        /* fall through to wallet / paystack */
      }
    }

    const credit = await prisma.therapyCredit.findUnique({
      where: { patientId: patient.id },
    });
    const balance = Number(credit?.balance ?? 0);
    if (balance >= 2) {
      try {
        const out = await finalizePsychiatricPaymentWithWalletCredits(booking.id);
        if (out.shouldSendConfirmationEmail) {
          void sendTherapyBookingPaidNotifications(out.booking).catch(() => {});
        }
        return NextResponse.json({
          success: true,
          data: { status: "accepted", paidVia: "wallet_credits", sessionId: out.sessionId },
        });
      } catch {
        /* fall through */
      }
    }

    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    if (!base) {
      return NextResponse.json(
        { success: false, error: "App URL not configured" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: "payment_required",
        pay: { bookingId: booking.id },
      },
    });
  } catch (e) {
    console.error("patient/psychiatric-invitations PATCH:", e);
    captureApiError(e, { route: "/patient/psychiatric-invitations/[id]" });
    return NextResponse.json(
      { success: false, error: "Request failed" },
      { status: 500 },
    );
  }
}
