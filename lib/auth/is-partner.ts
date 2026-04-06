import type { User } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma/client";

export async function isPartnerUser(user: User | null): Promise<boolean> {
  if (!user?.id) return false;
  if (user.app_metadata?.role === "partner") return true;
  const profile = await prisma.sharedProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  return profile?.role === "partner";
}
