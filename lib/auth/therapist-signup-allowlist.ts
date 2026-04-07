import type { SupabaseClient } from "@supabase/supabase-js";

import { findUserIdByEmail } from "@/lib/auth/find-user-by-email";

/**
 * Emails allowed to complete **new** therapist self-signup (in addition to users who
 * already have role `therapist` in Supabase). Case-insensitive.
 * Extend via env `THERAPIST_SIGNUP_ALLOWLIST` (comma-separated).
 */
const DEFAULT_THERAPIST_SIGNUP_EMAILS = [
  "sewathompson@gmail.com",
  "ololade.oketunbi@gmail.com",
  "comfortdaniel412@gmail.com",
  "oluwaseunkupoluyi@gmail.com",
] as const;

export function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseEnvAllowlist(): string[] {
  const raw = process.env.THERAPIST_SIGNUP_ALLOWLIST?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => normalizeSignupEmail(s)).filter(Boolean);
}

function buildAllowlistSet(): Set<string> {
  const set = new Set<string>();
  for (const e of DEFAULT_THERAPIST_SIGNUP_EMAILS) {
    set.add(normalizeSignupEmail(e));
  }
  for (const e of parseEnvAllowlist()) {
    set.add(e);
  }
  return set;
}

/**
 * Returns true if this email may proceed with therapist signup OTP / account creation.
 * - Allowed: on static + env allowlist
 * - Allowed: Supabase user already has `app_metadata.role === "therapist"` (existing therapist)
 * - Blocked: existing user with role `patient` (use a different email or contact support)
 */
export async function isTherapistSignupAllowed(
  supabase: SupabaseClient,
  email: string,
): Promise<{ allowed: boolean; reason?: "patient_conflict" }> {
  const n = normalizeSignupEmail(email);
  const allowlist = buildAllowlistSet();
  if (allowlist.has(n)) {
    return { allowed: true };
  }

  const uid = await findUserIdByEmail(supabase, n);
  if (!uid) {
    return { allowed: false };
  }

  const { data, error } = await supabase.auth.admin.getUserById(uid);
  if (error || !data.user) {
    return { allowed: false };
  }

  const existingRole = (data.user.app_metadata as { role?: string } | null)?.role;
  if (existingRole === "therapist") {
    return { allowed: true };
  }
  if (existingRole === "patient") {
    return { allowed: false, reason: "patient_conflict" };
  }

  return { allowed: false };
}
