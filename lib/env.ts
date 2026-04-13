import { z } from "zod";

/**
 * Validates critical env vars on the Node server in production.
 * Skips during `next build` and in development so local workflows keep working.
 */
export function validateProductionEnv(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.CI === "true" || process.env.SKIP_ENV_VALIDATION === "1") {
    return;
  }
  if (process.env.NODE_ENV !== "production") return;

  const schema = z.object({
    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    PAYSTACK_SECRET_KEY: z.string().min(1),
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  });

  const result = schema.safeParse(process.env);
  if (!result.success) {
    const msg = result.error.flatten().fieldErrors;
    console.error("[env] Missing or invalid production environment variables:", msg);
    throw new Error(
      "Invalid server environment. Set required variables in Netlify/hosting dashboard.",
    );
  }
}
