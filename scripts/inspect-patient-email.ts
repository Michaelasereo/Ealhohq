/**
 * Read-only DB inspection: therapy_patients (+ bookings/credits counts) for an email.
 * Loads DATABASE_URL from .env.local then .env (first wins per key).
 *
 * Usage: npx tsx scripts/inspect-patient-email.ts [email-substring]
 * Default substring: michaelasereoo
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

import { PrismaClient } from "@prisma/client";

function loadEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

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

async function main() {
  loadEnvFiles();
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL missing. Set it in .env.local or .env.");
    process.exit(1);
  }

  const needle =
    (process.argv[2] ?? "michaelasereoo").trim() || "michaelasereoo";

  const prisma = createPrisma();
  try {
    const patients = await prisma.therapyPatient.findMany({
      where: {
        email: { contains: needle, mode: "insensitive" },
      },
      orderBy: { createdAt: "asc" },
      include: {
        profile: { select: { id: true, fullName: true, role: true } },
        credits: { select: { balance: true } },
        _count: {
          select: {
            bookings: true,
            sessionPackages: true,
            transactions: true,
          },
        },
      },
    });

    console.log("=== therapy_patients (email contains %s) ===\n", needle);
    if (patients.length === 0) {
      console.log("No rows found.");
    }
    for (const p of patients) {
      const bookingStats = await prisma.therapyBooking.groupBy({
        by: ["status"],
        where: { patientId: p.id },
        _count: { _all: true },
      });
      const paidBookings = await prisma.therapyBooking.count({
        where: {
          patientId: p.id,
          paymentStatus: "paid",
        },
      });
      console.log({
        patientId: p.id,
        email: p.email,
        fullName: p.fullName,
        profileId: p.profileId,
        linkedProfileName: p.profile?.fullName ?? null,
        profileRole: p.profile?.role ?? null,
        creditBalance: p.credits ? Number(p.credits.balance) : 0,
        counts: p._count,
        paidBookings,
        bookingsByStatus: Object.fromEntries(
          bookingStats.map((b) => [b.status, b._count._all]),
        ),
        createdAt: p.createdAt.toISOString(),
      });
      console.log("");
    }

    // Supabase: auth.users (same DB) — may fail if role cannot read auth schema
    try {
      type AuthRow = { id: string; email: string | null; created_at: Date | null };
      const authRows = await prisma.$queryRaw<AuthRow[]>`
        SELECT id, email, created_at
        FROM auth.users
        WHERE email ILIKE ${"%" + needle + "%"}
        ORDER BY created_at ASC
      `;
      console.log("=== auth.users (email ILIKE %needle%) ===\n");
      for (const u of authRows) {
        console.log({
          userId: u.id,
          email: u.email,
          createdAt: u.created_at?.toISOString() ?? null,
        });
      }
      if (authRows.length === 0) {
        console.log("(no matching auth users)\n");
      }
    } catch (e) {
      console.log(
        "=== auth.users ===\n(skipped: insufficient DB permission or not Supabase)\n",
        e instanceof Error ? e.message : e,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
