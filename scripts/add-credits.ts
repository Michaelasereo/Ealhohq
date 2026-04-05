import { PrismaClient } from "@prisma/client";

/** Same logic as `lib/prisma/client.ts` for Supabase pooler. */
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

/** Default test patient email (override with PATIENT_EMAIL env). */
const PATIENT_EMAIL =
  process.env.PATIENT_EMAIL?.trim() || "michaelasereoo@gmail.com";

async function main() {
  const patient = await prisma.therapyPatient.findFirst({
    where: { email: PATIENT_EMAIL },
  });

  if (!patient) {
    console.error(
      `❌ Patient not found for email: ${PATIENT_EMAIL}`,
    );
    process.exit(1);
  }

  await prisma.therapyCredit.upsert({
    where: { patientId: patient.id },
    update: { balance: 10, tier: "gold" },
    create: {
      patientId: patient.id,
      balance: 10,
      tier: "gold",
    },
  });

  await prisma.therapyCreditTransaction.create({
    data: {
      patientId: patient.id,
      amount: 10,
      type: "purchase",
      reference: "test_seed_credits",
    },
  });

  console.log(`✅ Added 10 credits to ${PATIENT_EMAIL}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
