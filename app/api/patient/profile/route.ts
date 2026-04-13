import { NextResponse } from "next/server";

import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const mh = patient.medicalHistory;

    return NextResponse.json({
      success: true,
      data: {
        id: patient.id,
        fullName: patient.profile?.fullName ?? patient.fullName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? "",
        gender: patient.gender ?? "",
        occupation: patient.occupation ?? "",
        medicalHistory: mh
          ? {
              currentMedications: mh.currentMedications ?? "",
              allergies: mh.allergies ?? "",
              previousDiagnoses: mh.previousDiagnoses ?? "",
              previousTherapy: mh.previousTherapy ?? "",
              familyMedical: mh.familyMedical ?? "",
              familyPsychiatric: mh.familyPsychiatric ?? "",
              familySubstanceUse: mh.familySubstanceUse ?? "",
            }
          : null,
      },
    });
  } catch (e) {
    console.error("client profile GET:", e);
    captureApiError(e, { route: "/patient/profile" });
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      gender?: string;
      occupation?: string;
      medicalHistory?: {
        currentMedications?: string;
        allergies?: string;
        previousDiagnoses?: string;
        previousTherapy?: string;
        familyMedical?: string;
        familyPsychiatric?: string;
        familySubstanceUse?: string;
      };
    };

    if (patient.profileId && typeof body.fullName === "string") {
      await prisma.sharedProfile.update({
        where: { id: patient.profileId },
        data: { fullName: body.fullName.trim() },
      });
    }

    await prisma.therapyPatient.update({
      where: { id: patient.id },
      data: {
        ...(typeof body.fullName === "string" ? { fullName: body.fullName.trim() } : {}),
        ...(typeof body.email === "string" ? { email: body.email.trim() } : {}),
        ...(typeof body.phone === "string" ? { phone: body.phone.trim() } : {}),
        ...(typeof body.dateOfBirth === "string"
          ? body.dateOfBirth.trim()
            ? { dateOfBirth: new Date(`${body.dateOfBirth.trim()}T12:00:00.000Z`) }
            : { dateOfBirth: null }
          : {}),
        ...(typeof body.gender === "string" ? { gender: body.gender } : {}),
        ...(typeof body.occupation === "string"
          ? { occupation: body.occupation }
          : {}),
      },
    });

    if (body.medicalHistory && typeof body.medicalHistory === "object") {
      const m = body.medicalHistory;
      await prisma.therapyMedicalHistory.upsert({
        where: { patientId: patient.id },
        create: {
          patientId: patient.id,
          currentMedications: m.currentMedications ?? null,
          allergies: m.allergies ?? null,
          previousDiagnoses: m.previousDiagnoses ?? null,
          previousTherapy: m.previousTherapy ?? null,
          familyMedical: m.familyMedical ?? null,
          familyPsychiatric: m.familyPsychiatric ?? null,
          familySubstanceUse: m.familySubstanceUse ?? null,
        },
        update: {
          currentMedications: m.currentMedications ?? null,
          allergies: m.allergies ?? null,
          previousDiagnoses: m.previousDiagnoses ?? null,
          previousTherapy: m.previousTherapy ?? null,
          familyMedical: m.familyMedical ?? null,
          familyPsychiatric: m.familyPsychiatric ?? null,
          familySubstanceUse: m.familySubstanceUse ?? null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("client profile PUT:", e);
    captureApiError(e, { route: "/patient/profile" });
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 },
    );
  }
}
