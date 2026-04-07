/**
 * Run the same merge + link logic as `ensureRegisteredPatientForUser` for a given
 * auth user id (shared_profiles.id). Use when dashboard merge did not run
 * (e.g. duplicate guest rows, stale state).
 *
 * Usage:
 *   npx tsx scripts/repair-merge-guest-to-profile.ts <authUserUuid> [email]
 *
 * If email is omitted, reads from auth.users (Supabase).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

async function main() {
  loadEnvFiles();
  const { prisma } = await import("@/lib/prisma/client");
  const { ensureRegisteredPatientForUser } = await import(
    "@/lib/queries/patient"
  );

  const userId = process.argv[2]?.trim();
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
    console.error(
      "Usage: npx tsx scripts/repair-merge-guest-to-profile.ts <authUserUuid> [email]",
    );
    process.exit(1);
  }

  let email = process.argv[3]?.trim() ?? "";
  if (!email) {
    type Row = { email: string | null };
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT email FROM auth.users WHERE id = ${userId}::uuid LIMIT 1
    `;
    email = rows[0]?.email?.trim() ?? "";
  }

  if (!email) {
    console.error("Could not resolve email; pass it as second argument.");
    process.exit(1);
  }

  console.log("Running ensureRegisteredPatientForUser for", userId, email);

  const result = await ensureRegisteredPatientForUser({
    id: userId,
    email,
  });

  if (!result?.patient) {
    console.error(
      "No patient linked. Check shared_profiles exists, role=patient, and email matches guest rows.",
    );
    process.exit(1);
  }

  const p = result.patient;
  console.log("OK — linked patient:", {
    patientId: p.id,
    profileId: p.profileId,
    email: p.email,
    fullName: p.fullName,
  });

  await prisma.$disconnect();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
