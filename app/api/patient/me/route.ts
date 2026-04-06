import { NextResponse } from "next/server";

import { CREDIT_PACKAGES } from "@/lib/credits/packages";
import { mapSessionForPatient } from "@/lib/mappers/patient-session";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

function firstName(fullName: string) {
  const t = fullName.trim();
  return t.split(/\s+/)[0] ?? t;
}

function tierLabel(tier: string): string {
  const map: Record<string, string> = {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
  };
  return map[tier.toLowerCase()] ?? tier;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;

    if (!patient) {
      const profile = await prisma.sharedProfile.findUnique({
        where: { id: user.id },
      });
      return NextResponse.json({
        success: true,
        data: {
          patient: null,
          profile: profile
            ? {
                fullName: profile.fullName,
                email: user.email ?? "",
                phone: profile.phone,
              }
            : null,
          sessions: [] as ReturnType<typeof mapSessionForPatient>[],
          credits: null,
          transactions: [] as { id: string; date: string; type: string; amount: number }[],
          creditPackages: CREDIT_PACKAGES,
        },
        error: null,
        meta: { timestamp: new Date().toISOString() },
      });
    }

    const sessionsRaw = await prisma.therapySession.findMany({
      where: { patientId: patient.id },
      include: {
        booking: true,
        therapist: { include: { profile: true } },
        feedbacks: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const sessions = sessionsRaw.map(mapSessionForPatient);

    const credit = patient.credits;
    const txs = await prisma.therapyCreditTransaction.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const transactions = txs.map((tx) => ({
      id: tx.id,
      date: tx.createdAt.toISOString().slice(0, 10),
      type: tx.type,
      amount: tx.amount,
    }));

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          firstName: firstName(patient.profile?.fullName ?? patient.fullName),
          fullName: patient.fullName,
          email: patient.email,
          phone: patient.phone,
          dob: patient.dateOfBirth?.toISOString().slice(0, 10) ?? "",
          gender: patient.gender ?? "",
          occupation: patient.occupation ?? "",
          medications: patient.medicalHistory?.currentMedications ?? "",
          allergies: patient.medicalHistory?.allergies ?? "",
          diagnoses: patient.medicalHistory?.previousDiagnoses ?? "",
          therapyHistory: patient.medicalHistory?.previousTherapy ?? "",
          familyMedical: patient.medicalHistory?.familyMedical ?? "",
          familyPsychiatric: patient.medicalHistory?.familyPsychiatric ?? "",
          familySubstanceUse: patient.medicalHistory?.familySubstanceUse ?? "",
        },
        profile: patient.profile
          ? {
              fullName: patient.profile.fullName,
              email: patient.email,
              phone: patient.phone,
            }
          : null,
        sessions,
        credits: credit
          ? {
              balance: credit.balance,
              tier: tierLabel(credit.tier),
            }
          : { balance: 0, tier: "Bronze" },
        transactions,
        creditPackages: CREDIT_PACKAGES,
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("client/me error:", e);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to load patient data",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
