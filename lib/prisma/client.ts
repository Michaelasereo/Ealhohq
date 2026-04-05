import { PrismaClient } from "@prisma/client";

/**
 * Supabase transaction pool (PgBouncer / Supavisor, typically port 6543) does not
 * support Prisma’s default prepared statements unless the URL includes
 * `pgbouncer=true` (and usually `connection_limit=1`). Without this, queries can
 * fail with Postgres `08P01` bind/prepared-statement errors.
 * @see https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer
 */
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

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  const url = poolerSafeDatabaseUrl(raw);
  if (raw && url && url !== raw) {
    return new PrismaClient({ datasources: { db: { url } } });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
