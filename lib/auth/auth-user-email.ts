import { prisma } from "@/lib/prisma/client";

/** Resolves login email from Supabase `auth.users` (same DB as Prisma). */
export async function getAuthUserEmailById(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRaw<{ email: string | null }[]>`
      SELECT email FROM auth.users WHERE id = ${userId}::uuid LIMIT 1
    `;
    const e = rows[0]?.email?.trim();
    return e && e.length > 0 ? e : null;
  } catch {
    return null;
  }
}
