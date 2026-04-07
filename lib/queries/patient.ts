import {
  canonicalEmailForGuestMatch,
  isGoogleHostedConsumerDomain,
} from "@/lib/email/gmail-canonical";
import { syncTherapyCreditBalanceFromTransactions } from "@/lib/credits/sync-balance-from-transactions";
import { prisma } from "@/lib/prisma/client";

import { mergePatientRecordsIntoPrimary } from "@/lib/queries/patient-merge";

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

export type EnsureRegisteredPatientResult = {
  patient: Awaited<ReturnType<typeof getPatientByProfileId>>;
};

/** Bookings tied to guest rows before merge (confirmed or completed). */
async function countGuestBookingsForPatients(patientIds: string[]) {
  if (patientIds.length === 0) return 0;
  return prisma.therapyBooking.count({
    where: {
      patientId: { in: patientIds },
      status: { in: ["confirmed", "completed"] },
    },
  });
}

async function markGuestMergePendingIfNeeded(
  profileId: string,
  guestPatientIds: string[],
  guestMergeCompleted: boolean,
) {
  if (guestMergeCompleted || guestPatientIds.length === 0) return;
  const n = await countGuestBookingsForPatients(guestPatientIds);
  await prisma.sharedProfile.update({
    where: { id: profileId },
    data: {
      guestMergeBannerPending: true,
      guestMergeSessionCount: n > 0 ? n : null,
    },
  });
}

/**
 * Auth creates `shared_profiles` but not always `therapy_patients`.
 * Call this on every patient API that needs the linked `therapy_patients` row.
 *
 * - If the same email was used for guest bookings (`profileId` null), those rows are
 *   merged into this account so bookings, packages, and credits stay visible.
 * - If a profile-linked patient already exists but guest rows with the same email remain
 *   (e.g. race or older flows), guests are merged into the linked patient.
 */
export async function ensureRegisteredPatientForUser(user: {
  id: string;
  email?: string | null;
}): Promise<EnsureRegisteredPatientResult | null> {
  const profile = await prisma.sharedProfile.findUnique({
    where: { id: user.id },
  });
  if (!profile || profile.role !== "patient") {
    return null;
  }

  const emailRaw = (user.email ?? "").trim();
  if (!emailRaw) {
    return null;
  }

  const emailNorm = emailRaw.toLowerCase();

  const existing = await getPatientByProfileId(user.id);

  let guests = await prisma.therapyPatient.findMany({
    where: {
      profileId: null,
      email: { equals: emailNorm, mode: "insensitive" },
    },
    orderBy: { createdAt: "asc" },
  });

  if (guests.length === 0 && isGoogleHostedConsumerDomain(emailNorm)) {
    const canon = canonicalEmailForGuestMatch(emailNorm);
    const candidates = await prisma.therapyPatient.findMany({
      where: {
        profileId: null,
        OR: [
          { email: { endsWith: "@gmail.com", mode: "insensitive" } },
          { email: { endsWith: "@googlemail.com", mode: "insensitive" } },
        ],
      },
    });
    guests = candidates
      .filter((g) => canonicalEmailForGuestMatch(g.email) === canon)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  const guestIds = guests.map((g) => g.id);
  const mergeCompleted = profile.guestMergeCompleted;

  if (existing && guests.length > 0) {
    const merged = await prisma.$transaction(async (tx) => {
      for (const g of guests) {
        await mergePatientRecordsIntoPrimary(tx, existing.id, g.id);
      }
      return tx.therapyPatient.findUniqueOrThrow({
        where: { id: existing.id },
        include: patientInclude,
      });
    });
    await markGuestMergePendingIfNeeded(
      user.id,
      guestIds,
      mergeCompleted,
    );
    await syncTherapyCreditBalanceFromTransactions(merged.id);
    return { patient: merged };
  }

  if (existing) {
    return { patient: existing };
  }

  const created = await prisma.$transaction(async (tx) => {
    if (guests.length === 0) {
      return tx.therapyPatient.create({
        data: {
          profileId: profile.id,
          fullName: profile.fullName.trim() || "Patient",
          email: emailNorm,
          phone: profile.phone ?? "",
        },
        include: patientInclude,
      });
    }

    const primary = guests[0];
    for (const sec of guests.slice(1)) {
      await mergePatientRecordsIntoPrimary(tx, primary.id, sec.id);
    }

    return tx.therapyPatient.update({
      where: { id: primary.id },
      data: {
        profileId: profile.id,
        fullName: profile.fullName.trim() || primary.fullName,
        email: emailNorm,
        phone: primary.phone || profile.phone || "",
      },
      include: patientInclude,
    });
  });

  await markGuestMergePendingIfNeeded(user.id, guestIds, mergeCompleted);

  if (guestIds.length > 0) {
    await syncTherapyCreditBalanceFromTransactions(created.id);
  }

  return { patient: created };
}

export async function getTherapistByProfileId(profileId: string) {
  return prisma.therapyTherapist.findUnique({
    where: { profileId },
    include: { profile: true },
  });
}
