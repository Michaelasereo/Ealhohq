/**
 * Look up shared_profiles + therapy_patient by profile (auth) UUID.
 * Usage: npx tsx scripts/inspect-profile-id.ts <uuid>
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
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

async function main() {
  loadEnvFiles();
  const id = process.argv[2]?.trim();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    console.error("Usage: npx tsx scripts/inspect-profile-id.ts <uuid>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const profile = await prisma.sharedProfile.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            _count: {
              select: { bookings: true, sessionPackages: true },
            },
          },
        },
      },
    });
    console.log("=== shared_profiles + patient ===\n");
    console.log(
      profile
        ? JSON.stringify(
            {
              id: profile.id,
              role: profile.role,
              fullName: profile.fullName,
              guestMergeCompleted: profile.guestMergeCompleted,
              guestMergeBannerPending: profile.guestMergeBannerPending,
              patient: profile.patient
                ? {
                    id: profile.patient.id,
                    email: profile.patient.email,
                    fullName: profile.patient.fullName,
                    profileId: profile.patient.profileId,
                    counts: profile.patient._count,
                  }
                : null,
            },
            null,
            2,
          )
        : "(no shared_profiles row for this id)",
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
