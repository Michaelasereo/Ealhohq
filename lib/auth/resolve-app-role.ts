import { prisma } from "@/lib/prisma/client";

export type AppRole = "patient" | "therapist" | "admin";

/**
 * Server-side role for authorization. Prefer DB (`shared_profiles.role`) over JWT
 * `app_metadata.role`, which can be missing or stale after signup.
 */
export async function resolveAppRole(userId: string): Promise<AppRole | null> {
  const p = await prisma.sharedProfile.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const r = p?.role;
  if (r === "patient" || r === "therapist" || r === "admin") return r;
  return null;
}
