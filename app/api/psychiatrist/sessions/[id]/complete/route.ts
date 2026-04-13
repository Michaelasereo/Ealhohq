import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthUserEmailById } from "@/lib/auth/auth-user-email";
import { requirePsychiatristUser } from "@/lib/auth/require-psychiatrist-api";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sendWhatsApp } from "@/lib/whatsapp/client";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const rxSchema = z.object({
  medicationName: z.string().min(1),
  category: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.string().min(1),
  instructions: z.string().optional().nullable(),
});

const bodySchema = z.object({
  sessionNotes: z.string().min(50),
  summaryForTherapist: z.string().min(20).max(1000),
  prescriptions: z.array(rxSchema).default([]),
  termsAccepted: z.boolean(),
  patientConsentedToShareNotes: z.boolean(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requirePsychiatristUser();
  if (gate.response) return gate.response;
  const psychiatrist = gate.psychiatrist;
  if (!psychiatrist) {
    return NextResponse.json(
      { success: false, error: "Psychiatrist profile not found" },
      { status: 403 },
    );
  }

  const { id: sessionId } = await ctx.params;

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

  if (!parsed.data.termsAccepted) {
    return NextResponse.json(
      { success: false, error: "Terms must be accepted" },
      { status: 400 },
    );
  }

  try {
    const session = await prisma.psychiatricSession.findFirst({
      where: { id: sessionId, psychiatristId: psychiatrist.id },
      include: {
        patient: true,
        referral: {
          include: {
            therapist: { include: { profile: true } },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Session already completed" },
        { status: 400 },
      );
    }

    const pharmacy =
      parsed.data.prescriptions.length > 0
        ? await prisma.pharmacyPartner.findFirst({
            where: { isActive: true, isDefault: true },
          })
        : null;

    if (parsed.data.prescriptions.length > 0 && !pharmacy) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No default active pharmacy configured — add one in Admin → Pharmacy partners.",
        },
        { status: 400 },
      );
    }

    const pharmacyCode =
      parsed.data.prescriptions.length > 0
        ? `ELH${randomBytes(3).toString("hex").toUpperCase()}`
        : null;

    await prisma.$transaction(async (tx) => {
      if (parsed.data.prescriptions.length > 0) {
        await tx.psychiatricPrescription.createMany({
          data: parsed.data.prescriptions.map((p) => ({
            psychiatricSessionId: session.id,
            medicationName: p.medicationName.trim(),
            category: p.category.trim(),
            dosage: p.dosage.trim(),
            frequency: p.frequency.trim(),
            duration: p.duration.trim(),
            notes: p.instructions?.trim() ?? null,
          })),
        });
      }

      await tx.psychiatricSession.update({
        where: { id: session.id },
        data: {
          sessionNotes: parsed.data.sessionNotes.trim(),
          summaryForTherapist: parsed.data.summaryForTherapist.trim(),
          termsAccepted: true,
          patientConsentedToShareNotes: parsed.data.patientConsentedToShareNotes,
          prescriptionSent: parsed.data.prescriptions.length > 0,
          pharmacyPartnerId: pharmacy?.id ?? null,
          pharmacyCode,
          status: "completed",
          completedAt: new Date(),
        },
      });

      await tx.psychiatricReferral.update({
        where: { id: session.referralId },
        data: { status: "completed" },
      });

      await tx.therapySession.updateMany({
        where: { bookingId: session.bookingId },
        data: { status: "completed", endedAt: new Date() },
      });
    });

    const patient = session.patient;

    if (parsed.data.prescriptions.length > 0 && pharmacy && pharmacyCode) {
      if (patient.phone) {
        void sendWhatsApp({
          to: patient.phone,
          body: `Your psychiatric assessment is complete. Pickup: ${pharmacy.name}. Code: ${pharmacyCode}. Present this code at the pharmacy.`,
        }).catch(() => {});
      }

      void sendTransactionalEmail({
        to: pharmacy.contactEmail,
        subject: `Prescription — pickup code ${pharmacyCode}`,
        html: `<p>Pickup code (anonymous): <strong>${pharmacyCode}</strong></p>
        <p>Medications: ${parsed.data.prescriptions.map((p) => `${p.medicationName} ${p.dosage}`).join(", ")}</p>`,
      }).catch(() => {});
    }

    const therapistEmailAddr = await getAuthUserEmailById(
      session.referral.therapist.profileId,
    );
    if (therapistEmailAddr) {
      void sendTransactionalEmail({
        to: therapistEmailAddr,
        subject: "Psychiatric assessment summary",
        html: `<p>${parsed.data.patientConsentedToShareNotes ? "The client consented to share fuller documentation." : "Summary for ongoing therapy:"}</p>
        <p>${parsed.data.summaryForTherapist.replace(/</g, "&lt;")}</p>`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("psychiatrist/sessions/complete POST:", e);
    captureApiError(e, { route: "/psychiatrist/sessions/[id]/complete" });
    return NextResponse.json(
      { success: false, error: "Failed to save" },
      { status: 500 },
    );
  }
}
