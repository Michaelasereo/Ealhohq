import type { User } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma/client";

/**
 * Admin access: JWT `app_metadata.role` (preferred) or `shared_profiles.role`
 * for users promoted in DB before re-login refreshed claims.
 */
export async function isAdminUser(user: User | null): Promise<boolean> {
  if (!user?.id) return false;
  if (user.app_metadata?.role === "admin") return true;

  const profile = await prisma.sharedProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  return profile?.role === "admin";
}
