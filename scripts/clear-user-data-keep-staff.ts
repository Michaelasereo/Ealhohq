/**
 * Destructive: removes patient/guest transactional data and patient accounts from the DB.
 * Preserves therapists, admins (shared_profiles.role = admin), psychiatrists, and staff-linked profiles.
 *
 * Requires:
 *   CONFIRM_CLEAR_USER_DATA=yes
 *
 * Optional (also deletes Supabase Auth users who are not staff):
 *   CLEAR_SUPABASE_AUTH_USERS=yes
 *   Needs SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
 *
 * Staff auth users are kept if:
 *   - Their user id is in kept Prisma profiles (therapist / admin / psychiatrist with profileId), or
 *   - app_metadata.role is therapist | admin | psychiatrist (covers psychiatrists without SharedProfile yet).
 *
 * Run:
 *   CONFIRM_CLEAR_USER_DATA=yes npx tsx scripts/clear-user-data-keep-staff.ts
 *   npm run clear-user-data   # same; still requires CONFIRM_CLEAR_USER_DATA=yes
 */
import { PrismaClient } from "@prisma/client";
import { createServiceRoleClient } from "../lib/supabase/service-role";

function poolerSafeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  if (url.includes("pgbouncer=true")) return url;
  try {
    const u = new URL(url);
    const looksLikeSupabasePooler =
      u.port === "6543" ||
      u.hostname.includes("pooler.supabase") ||
      u.hostname.includes("supavisor");
    if (!looksLikeSupabasePooler) return url;
    u.searchParams.set("pgbouncer", "true");
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "1");
    }
    return u.toString();
  } catch {
    return url;
  }
}

function createPrisma(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  const url = poolerSafeDatabaseUrl(raw);
  if (raw && url && url !== raw) {
    return new PrismaClient({ datasources: { db: { url } } });
  }
  return new PrismaClient();
}

const prisma = createPrisma();

async function collectKeptProfileIds(): Promise<Set<string>> {
  const keep = new Set<string>();

  const therapists = await prisma.therapyTherapist.findMany({
    select: { profileId: true },
  });
  for (const t of therapists) keep.add(t.profileId);

  const psychiatrists = await prisma.psychiatrist.findMany({
    where: { profileId: { not: null } },
    select: { profileId: true },
  });
  for (const p of psychiatrists) {
    if (p.profileId) keep.add(p.profileId);
  }

  const admins = await prisma.sharedProfile.findMany({
    where: { role: "admin" },
    select: { id: true },
  });
  for (const a of admins) keep.add(a.id);

  return keep;
}

async function clearPostgresData() {
  await prisma.$transaction(
    async (tx) => {
      await tx.adminNotification.deleteMany();

      await tx.psychiatricInvitation.deleteMany();
      await tx.psychiatricPrescription.deleteMany();
      await tx.psychiatricSession.deleteMany();
      await tx.psychiatricReferral.deleteMany();

      await tx.therapySessionNote.deleteMany();
      await tx.therapyFeedback.deleteMany();
      await tx.therapySession.deleteMany();

      await tx.discountCodeUse.deleteMany();
      await tx.referralSession.deleteMany();
      await tx.referralPayout.deleteMany();

      await tx.therapyRebookingRequest.deleteMany();
      await tx.therapyBooking.deleteMany();

      await tx.chatMessage.deleteMany();
      await tx.chatAuditLog.deleteMany();
      await tx.chatThread.deleteMany();
      await tx.chatConsent.deleteMany();

      await tx.therapyCreditTransaction.deleteMany();
      await tx.therapyCredit.deleteMany();
      await tx.therapyMedicalHistory.deleteMany();
      await tx.therapySessionPackage.deleteMany();

      await tx.consentRecord.deleteMany();

      await tx.therapyPatient.updateMany({
        data: { partnerClientId: null },
      });
      await tx.partnerCreditAllocation.deleteMany();
      await tx.partnerClient.deleteMany();

      await tx.therapyPatient.deleteMany();

      await tx.sharedProfile.deleteMany({
        where: { role: "patient" },
      });

      await tx.clinicLead.deleteMany();
      await tx.subscriber.deleteMany();
      await tx.newsletterSend.deleteMany();
      await tx.blogPostFeedback.deleteMany();

      await tx.referralPartner.updateMany({
        data: {
          totalReferred: 0,
          totalEarned: 0,
          totalPaid: 0,
        },
      });

      await tx.discountCode.updateMany({
        data: { usedCount: 0 },
      });
    },
    { timeout: 120_000, maxWait: 60_000 },
  );
}

const STAFF_AUTH_ROLES = new Set(["therapist", "admin", "psychiatrist"]);

function isStaffAuthUser(
  u: { id: string; app_metadata?: Record<string, unknown> | null },
  keptProfileIds: Set<string>,
): boolean {
  if (keptProfileIds.has(u.id)) return true;
  const role = u.app_metadata?.role;
  return typeof role === "string" && STAFF_AUTH_ROLES.has(role);
}

async function clearSupabaseAuthUsers(keptProfileIds: Set<string>) {
  if (process.env.CLEAR_SUPABASE_AUTH_USERS !== "yes") {
    console.log("Skipping Supabase Auth (set CLEAR_SUPABASE_AUTH_USERS=yes to delete patient auth users).");
    return;
  }

  const supabase = createServiceRoleClient();
  const perPage = 1000;
  let deleted = 0;

  // Always re-fetch page 1: deleting users shifts pagination.
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage });
    if (error) throw error;
    const users = data.users;
    if (users.length === 0) break;

    let removedInBatch = 0;
    for (const u of users) {
      if (isStaffAuthUser(u, keptProfileIds)) continue;
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.warn(`Failed to delete auth user ${u.id}:`, delErr.message);
      } else {
        deleted++;
        removedInBatch++;
      }
    }

    if (removedInBatch === 0) {
      // Remaining users on page 1 are all staff; stop.
      break;
    }
  }

  console.log(`Supabase Auth: removed ${deleted} user(s) not in staff profile set.`);
}

async function main() {
  if (process.env.CONFIRM_CLEAR_USER_DATA !== "yes") {
    console.error(
      "Refusing to run: set CONFIRM_CLEAR_USER_DATA=yes (this destroys patient/guest data).",
    );
    process.exit(1);
  }

  const kept = await collectKeptProfileIds();
  console.log(
    `Keeping ${kept.size} profile id(s) (therapists + linked psychiatrist profiles + admins).`,
  );

  console.log("Clearing Postgres (Prisma)…");
  await clearPostgresData();
  console.log("Postgres data cleared.");

  await clearSupabaseAuthUsers(kept);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
