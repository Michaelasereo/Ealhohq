/**
 * Creates a confirmed booking + scheduled therapy session between a patient and therapist
 * so both can test /session/join (Agora) within the join window.
 *
 * Run from repo root (loads .env.local if present):
 *   npx tsx scripts/seed-video-test-session.ts
 *
 * Env overrides:
 *   PATIENT_EMAIL (default michaelasereoo@gmail.com)
 *   THERAPIST_EMAIL (default asereopeyemimichael@gmail.com)
 *   START_OFFSET_MIN (default 6) — minutes from now (WAT) for session start
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvLocal();

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

const PATIENT_EMAIL =
  process.env.PATIENT_EMAIL?.trim() || "michaelasereoo@gmail.com";
const THERAPIST_EMAIL =
  process.env.THERAPIST_EMAIL?.trim() || "asereopeyemimichael@gmail.com";
const START_OFFSET_MIN = Math.max(
  2,
  Math.min(120, Number(process.env.START_OFFSET_MIN ?? "6") || 6),
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (needed to resolve therapist by email).",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

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

/** WAT calendar date YYYY-MM-DD for instant `d`. */
function watYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** HH:mm in WAT for instant `d`. */
function watHHmm(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hh = parts.find((p) => p.type === "hour")?.value ?? "09";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

function endTimeFromStart(startTime: string, durationMin: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const startMins = h * 60 + m;
  const endMins = startMins + durationMin;
  const eh = Math.floor(endMins / 60) % 24;
  const em = endMins % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

async function main() {
  const patient = await prisma.therapyPatient.findFirst({
    where: { email: { equals: PATIENT_EMAIL, mode: "insensitive" } },
  });
  if (!patient) {
    console.error(`❌ No therapy_patients row for email: ${PATIENT_EMAIL}`);
    process.exit(1);
  }
  if (!patient.profileId) {
    console.error(
      `❌ Client ${PATIENT_EMAIL} has no profileId — sign up / link profile so video join auth works.`,
    );
    process.exit(1);
  }

  const therapistUser = await findAuthUserByEmail(THERAPIST_EMAIL);
  if (!therapistUser) {
    console.error(`❌ No auth.users account for therapist email: ${THERAPIST_EMAIL}`);
    process.exit(1);
  }

  const therapist = await prisma.therapyTherapist.findUnique({
    where: { profileId: therapistUser.id },
    include: { profile: true },
  });
  if (!therapist) {
    console.error(
      `❌ No therapy_therapists row for profileId ${therapistUser.id} (${THERAPIST_EMAIL}).`,
    );
    process.exit(1);
  }
  if (therapist.status !== "approved") {
    console.warn(
      `⚠️ Therapist status is "${therapist.status}" (expected approved for full dashboard).`,
    );
  }

  const duration = therapist.sessionDuration || 50;
  const startAt = new Date(Date.now() + START_OFFSET_MIN * 60_000);
  const ymd = watYmd(startAt);
  const startTime = watHHmm(startAt);
  const endTime = endTimeFromStart(startTime, duration);
  const day = new Date(`${ymd}T00:00:00+01:00`);

  const marker = `seed_video_${Date.now()}`;

  await prisma.therapyBooking.deleteMany({
    where: {
      patientId: patient.id,
      therapistId: therapist.id,
      paystackReference: { startsWith: "seed_video_" },
    },
  });

  const booking = await prisma.therapyBooking.create({
    data: {
      therapistId: therapist.id,
      patientId: patient.id,
      date: day,
      startTime,
      endTime,
      sessionType: "followup",
      status: "confirmed",
      paymentStatus: "paid",
      paystackReference: marker,
      consentConfirmed: true,
      consentTimestamp: new Date(),
      paidWithCredits: false,
    },
  });

  const session = await prisma.therapySession.create({
    data: {
      bookingId: booking.id,
      therapistId: therapist.id,
      patientId: patient.id,
      sessionNumber: 1,
      format: "telehealth",
      status: "scheduled",
    },
  });

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  console.log("\n✅ Video test session created\n");
  console.log(`   Booking ID:  ${booking.id}`);
  console.log(`   Session ID:  ${session.id}`);
  console.log(`   WAT:         ${ymd} ${startTime}–${endTime} (${duration} min)`);
  console.log(`   Client:      ${PATIENT_EMAIL}`);
  console.log(`   Therapist:   ${THERAPIST_EMAIL}`);
  console.log("\n   Join (same link for both; role from login):\n");
  console.log(`   ${base}/session/join?bookingId=${booking.id}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
