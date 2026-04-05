import { PrismaClient, Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Bypass Admin API pagination; requires DB role that can read auth.users (Supabase postgres can). */
async function findAuthUserIdBySql(email: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id::text AS id FROM auth.users WHERE email = ${email} LIMIT 1`,
    );
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function getUserByIdOrNull(id: string): Promise<User | null> {
  const { data, error } = await supabase.auth.admin.getUserById(id);
  if (error || !data.user) return null;
  return data.user;
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const bySql = await findAuthUserIdBySql(email);
  if (bySql) {
    const u = await getUserByIdOrNull(bySql);
    if (u) return u;
  }
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.warn("listUsers:", error.message);
      return null;
    }
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

/** JWT app_metadata.status — seeded therapists are approved so they can use the dashboard. */
async function syncAppMetadata(
  userId: string,
  role: string,
  status: string,
) {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role, status },
  });
  if (error) console.warn(`app_metadata sync ${userId}:`, error.message);
}

/** Create auth user, or return existing if email already registered. */
async function getOrCreateAuthUser(
  email: string,
  password: string,
  role: string,
  fullName: string,
  jwtStatus: string,
): Promise<User> {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    console.log(`↪ Auth user already exists: ${email}`);
    await syncAppMetadata(existing.id, role, jwtStatus);
    return existing;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  });
  if (error) {
    const retry = await findAuthUserByEmail(email);
    if (retry) {
      console.log(`↪ Auth user exists after create error: ${email}`);
      await syncAppMetadata(retry.id, role, jwtStatus);
      return retry;
    }
    console.error(`
If you see "Database error creating new user", the signup trigger on auth.users is failing.
1) Re-run supabase/migrations/001_auth_trigger.sql (no UPDATE on auth.users inside the trigger).
2) Run supabase/migrations/003_rls_shared_profiles_insert_from_auth.sql in the SQL Editor.
`);
    throw new Error(`Failed to create ${email}: ${error.message}`);
  }
  const user = data.user!;
  await syncAppMetadata(user.id, role, jwtStatus);
  return user;
}

async function main() {
  console.log("Seeding database...");

  // Admin
  const adminUser = await getOrCreateAuthUser(
    "admin@ealhohq.com",
    "TestAdmin123!",
    "admin",
    "Ealho Admin",
    "active",
  );
  await prisma.sharedProfile.upsert({
    where: { id: adminUser.id },
    update: {},
    create: {
      id: adminUser.id,
      role: "admin",
      fullName: "Ealho Admin",
      status: "active",
    },
  });
  console.log("✅ Admin ready");

  // Therapist 1
  const t1User = await getOrCreateAuthUser(
    "therapist1@ealhohq.com",
    "TestTherapist123!",
    "therapist",
    "Dr. Amaka Obi",
    "approved",
  );
  const t1Profile = await prisma.sharedProfile.upsert({
    where: { id: t1User.id },
    update: {},
    create: {
      id: t1User.id,
      role: "therapist",
      fullName: "Dr. Amaka Obi",
      status: "pending",
    },
  });
  const t1 = await prisma.therapyTherapist.upsert({
    where: { profileId: t1Profile.id },
    update: {},
    create: {
      profileId: t1Profile.id,
      bio: "Specialist in anxiety and depression with 8 years of experience.",
      specializations: ["Anxiety", "Depression", "Stress Management"],
      qualifications: ["MSc Clinical Psychology", "CBT Certified"],
      status: "approved",
      sessionRate: 15000,
      sessionDuration: 50,
    },
  });
  await prisma.therapyAvailabilitySchedule.deleteMany({
    where: { therapistId: t1.id },
  });
  await prisma.therapyAvailabilitySchedule.createMany({
    data: [0, 1, 2, 3, 4].map((day) => ({
      therapistId: t1.id,
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
      sessionDurationMinutes: 50,
      bufferMinutes: 10,
    })),
  });
  console.log("✅ Therapist 1 ready");

  // Therapist 2
  const t2User = await getOrCreateAuthUser(
    "therapist2@ealhohq.com",
    "TestTherapist123!",
    "therapist",
    "Dr. Chidi Nwosu",
    "approved",
  );
  const t2Profile = await prisma.sharedProfile.upsert({
    where: { id: t2User.id },
    update: {},
    create: {
      id: t2User.id,
      role: "therapist",
      fullName: "Dr. Chidi Nwosu",
      status: "pending",
    },
  });
  const t2 = await prisma.therapyTherapist.upsert({
    where: { profileId: t2Profile.id },
    update: {},
    create: {
      profileId: t2Profile.id,
      bio: "Trauma-informed therapist specialising in PTSD and grief.",
      specializations: ["Trauma", "PTSD", "Grief"],
      qualifications: ["PhD Psychology", "EMDR Certified"],
      status: "approved",
      sessionRate: 15000,
      sessionDuration: 50,
    },
  });
  await prisma.therapyAvailabilitySchedule.deleteMany({
    where: { therapistId: t2.id },
  });
  await prisma.therapyAvailabilitySchedule.createMany({
    data: [0, 1, 2, 3, 4].map((day) => ({
      therapistId: t2.id,
      dayOfWeek: day,
      startTime: "10:00",
      endTime: "18:00",
      sessionDurationMinutes: 50,
      bufferMinutes: 10,
    })),
  });
  console.log("✅ Therapist 2 ready");

  // Patient
  const pUser = await getOrCreateAuthUser(
    "patient@ealhohq.com",
    "TestPatient123!",
    "patient",
    "Test Patient",
    "active",
  );
  const pProfile = await prisma.sharedProfile.upsert({
    where: { id: pUser.id },
    update: {},
    create: {
      id: pUser.id,
      role: "patient",
      fullName: "Test Patient",
      status: "active",
    },
  });
  const patient = await prisma.therapyPatient.upsert({
    where: { profileId: pProfile.id },
    update: {},
    create: {
      profileId: pProfile.id,
      fullName: "Test Patient",
      email: "patient@ealhohq.com",
      phone: "08012345678",
    },
  });
  await prisma.therapyCredit.upsert({
    where: { patientId: patient.id },
    update: { balance: 2, tier: "bronze" },
    create: { patientId: patient.id, balance: 2, tier: "bronze" },
  });
  console.log("✅ Patient ready");

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
