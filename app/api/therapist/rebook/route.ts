import { NextResponse } from "next/server";
import { z } from "zod";

import {
  rebookInvitationHtml,
  rebookInvitationSubject,
} from "@/lib/emails/rebook-invitation";
import { formatLongDateWAT, formatTimeAmPmWAT } from "@/lib/rebooking/format-invite";
import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import {
  assertRebookSlotValid,
  bookingEndTime,
  patientHasBookingWithTherapist,
  ymdFromSuggestedDate,
} from "@/lib/rebooking/validate-request";
import { getTherapistByProfileId } from "@/lib/queries/patient";
import { prisma } from "@/lib/prisma/client";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl } from "@/lib/app-url";
import { watDayStart } from "@/lib/wat-datetime";

const bodySchema = z
  .object({
    patientId: z.string().uuid(),
    suggestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    suggestedTime: z.string().regex(/^\d{2}:\d{2}$/),
    sessionType: z.enum(["intake", "followup"]),
    message: z.string().max(2000).optional().nullable(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist || therapist.status !== "approved") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { patientId, suggestedDate, suggestedTime, sessionType, message } =
      parsed.data;

    const okRel = await patientHasBookingWithTherapist(
      patientId,
      therapist.id,
    );
    if (!okRel) {
      return NextResponse.json(
        { error: "You do not have an existing booking with this patient" },
        { status: 403 },
      );
    }

    const slotCheck = await assertRebookSlotValid({
      therapistId: therapist.id,
      dateYmd: suggestedDate,
      startTime: suggestedTime,
    });
    if (!slotCheck.ok) {
      return NextResponse.json({ error: slotCheck.error }, { status: 400 });
    }

    const endTime = bookingEndTime(
      suggestedTime,
      therapist.sessionDuration,
    );

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const request = await prisma.therapyRebookingRequest.create({
      data: {
        therapistId: therapist.id,
        patientId,
        suggestedDate: watDayStart(suggestedDate),
        suggestedTime,
        sessionType,
        message: message?.trim() || null,
        status: "pending",
        expiresAt,
      },
    });

    const patient = await prisma.therapyPatient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      await prisma.therapyRebookingRequest.delete({ where: { id: request.id } });
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const tProfile = await prisma.sharedProfile.findUnique({
      where: { id: therapist.profileId },
    });
    const therapistName = tProfile?.fullName ?? "Your therapist";
    const base = appBaseUrl();
    const confirmUrl = base
      ? `${base}/rebook/confirm/${request.id}`
      : `/rebook/confirm/${request.id}`;

    const dateLine = formatLongDateWAT(request.suggestedDate, suggestedTime);
    const timeLine = formatTimeAmPmWAT(request.suggestedDate, suggestedTime);
    const pf = firstName(patient.fullName);

    const waBody = `Hi ${pf}! 👋

${therapistName} has suggested your next therapy session:

📅 Date: ${dateLine}
🕐 Time: ${timeLine} WAT
⏱ Duration: ${therapist.sessionDuration} minutes

To confirm this session tap the link below.
This offer expires in 48 hours.

${confirmUrl}

Reply DECLINE to decline this suggestion.`;

    const phoneDigits = normalizeNgDigits(patient.phone);
    if (phoneDigits) {
      await sendWhatsAppText({ toE164Digits: phoneDigits, body: waBody });
    }

    const html = rebookInvitationHtml({
      patientFirstName: pf,
      therapistName,
      dateLine,
      timeLine,
      durationMins: therapist.sessionDuration,
      sessionTypeLabel:
        sessionType === "intake" ? "Intake" : "Follow-up",
      confirmUrl,
      message,
    });

    if (patient.email?.trim()) {
      await sendTransactionalEmail({
        to: patient.email.trim(),
        subject: rebookInvitationSubject(therapistName),
        html,
        text: waBody,
      });
    }

    await prisma.therapyRebookingRequest.update({
      where: { id: request.id },
      data: { notifiedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      requestId: request.id,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("therapist rebook POST:", e);
    return NextResponse.json(
      { error: "Failed to create rebooking request" },
      { status: 500 },
    );
  }
}
