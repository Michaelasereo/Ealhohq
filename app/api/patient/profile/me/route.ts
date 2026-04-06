import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ensureRegisteredPatientForUser,
  getPatientByProfileId,
} from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const patchSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    phone: z.string().optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
    currentMedications: z.string().optional().nullable(),
    allergies: z.string().optional().nullable(),
    previousDiagnoses: z.string().optional().nullable(),
    previousTherapy: z.string().optional().nullable(),
    familyMedical: z.string().optional().nullable(),
    familyPsychiatric: z.string().optional().nullable(),
    familySubstanceUse: z.string().optional().nullable(),
  })
  .strict();

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.sharedProfile.findUnique({
      where: { id: user.id },
    });

    const patient = await getPatientByProfileId(user.id);

    return NextResponse.json({
      success: true,
      data: {
        fullName: profile?.fullName ?? "",
        phone: profile?.phone ?? "",
        email: user.email ?? "",
        profilePhoto: null as string | null,
        patient: patient
          ? {
              id: patient.id,
              fullName: patient.fullName,
              dateOfBirth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? null,
              gender: patient.gender,
              occupation: patient.occupation,
              medicalHistory: patient.medicalHistory,
            }
          : null,
      },
    });
  } catch (e) {
    console.error("client profile/me GET:", e);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json();
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;

    if (body.fullName !== undefined || body.phone !== undefined) {
      await prisma.sharedProfile.update({
        where: { id: user.id },
        data: {
          ...(body.fullName !== undefined && { fullName: body.fullName.trim() }),
          ...(body.phone !== undefined && { phone: body.phone }),
        },
      });
    }

    let patient = await getPatientByProfileId(user.id);
    if (
      !patient &&
      (body.dateOfBirth !== undefined ||
        body.gender !== undefined ||
        body.occupation !== undefined ||
        body.fullName !== undefined)
    ) {
      patient = await ensureRegisteredPatientForUser(user);
    }

    if (patient) {
      const pUpdate: {
        fullName?: string;
        dateOfBirth?: Date | null;
        gender?: string | null;
        occupation?: string | null;
      } = {};
      if (body.fullName !== undefined) pUpdate.fullName = body.fullName.trim();
      if (body.dateOfBirth !== undefined) {
        pUpdate.dateOfBirth = body.dateOfBirth
          ? new Date(`${body.dateOfBirth}T12:00:00Z`)
          : null;
      }
      if (body.gender !== undefined) pUpdate.gender = body.gender;
      if (body.occupation !== undefined) pUpdate.occupation = body.occupation;

      if (Object.keys(pUpdate).length > 0) {
        await prisma.therapyPatient.update({
          where: { id: patient.id },
          data: pUpdate,
        });
      }

      const medicalData = {
        currentMedications: body.currentMedications,
        allergies: body.allergies,
        previousDiagnoses: body.previousDiagnoses,
        previousTherapy: body.previousTherapy,
        familyMedical: body.familyMedical,
        familyPsychiatric: body.familyPsychiatric,
        familySubstanceUse: body.familySubstanceUse,
      };

      const hasMedical = Object.values(medicalData).some(
        (v) => v !== undefined,
      );
      if (hasMedical) {
        const updatePayload: Record<string, string | null> = {};
        for (const [k, v] of Object.entries(medicalData)) {
          if (v !== undefined) updatePayload[k] = v;
        }
        await prisma.therapyMedicalHistory.upsert({
          where: { patientId: patient.id },
          update: updatePayload,
          create: {
            patientId: patient.id,
            ...updatePayload,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("client profile/me PATCH:", e);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
