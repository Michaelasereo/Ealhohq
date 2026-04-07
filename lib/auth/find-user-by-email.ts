import type { SupabaseClient } from "@supabase/supabase-js";

/** Paginated scan of auth users — use sparingly (OTP flows only). */
export async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  for (let i = 0; i < 10; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("findUserIdByEmail listUsers:", error);
      return null;
    }
    const u = data.users.find((x) => x.email?.toLowerCase() === normalized);
    if (u) return u.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}
