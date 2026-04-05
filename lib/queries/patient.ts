import { prisma } from "@/lib/prisma/client";

export async function getPatientByProfileId(profileId: string) {
  return prisma.therapyPatient.findUnique({
    where: { profileId },
    include: {
      profile: true,
      credits: true,
      medicalHistory: true,
    },
  });
}

const patientInclude = {
  profile: true,
  credits: true,
  medicalHistory: true,
} as const;

/**
 * Auth creates `shared_profiles` but not always `therapy_patients`.
 * Align with dashboard/sessions APIs by creating the patient row on first profile access.
 */
export async function ensureRegisteredPatientForUser(user: {
  id: string;
  email?: string | null;
}) {
  const existing = await getPatientByProfileId(user.id);
  if (existing) return existing;

  const profile = await prisma.sharedProfile.findUnique({
    where: { id: user.id },
  });
  if (!profile || profile.role !== "patient") {
    return null;
  }

  const email = (user.email ?? "").trim();
  if (!email) {
    return null;
  }

  return prisma.therapyPatient.create({
    data: {
      profileId: profile.id,
      fullName: profile.fullName.trim() || "Patient",
      email,
      phone: profile.phone ?? "",
    },
    include: patientInclude,
  });
}

export async function getTherapistByProfileId(profileId: string) {
  return prisma.therapyTherapist.findUnique({
    where: { profileId },
    include: { profile: true },
  });
}
