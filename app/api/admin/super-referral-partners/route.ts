import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { normalizeSuperReferralSlug, slugFromPartnerName } from "@/lib/partners/referral-slug";
import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
function partnerListErrorResponse(e: unknown): {
  status: number;
  body: {
    success: false;
    error: string;
    meta?: { code?: string; detail?: string };
  };
} {
  console.error("super-referral-partners GET:", e);
    captureApiError(e, { route: "/admin/super-referral-partners" });

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021" || e.code === "P2010" || e.code === "P2022") {
      return {
        status: 503,
        body: {
          success: false,
          error:
            "Partner database tables are missing or out of date. Run migrations: npx prisma migrate deploy (with DATABASE_URL and DIRECT_URL set).",
          meta: { code: e.code },
        },
      };
    }
  }

  if (e instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      body: {
        success: false,
        error:
          "Could not connect to the database. Check DATABASE_URL and that the server can reach Postgres.",
      },
    };
  }

  const msg = e instanceof Error ? e.message : String(e);
  if (/prepared statement|08P01|bind/i.test(msg)) {
    return {
      status: 503,
      body: {
        success: false,
        error:
          "Database connection issue (often pooler + prepared statements). Ensure DATABASE_URL uses pgbouncer=true for Supabase pooler port 6543, or use DIRECT_URL for migrations.",
      },
    };
  }

  return {
    status: 500,
    body: {
      success: false,
      error: "Failed to load partners",
      ...(process.env.NODE_ENV === "development" && e instanceof Error
        ? { meta: { detail: e.message.slice(0, 300) } }
        : {}),
    },
  };
}

const createBody = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email(),
  contactName: z.string().min(1),
  referralSlug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Slug: letters, numbers, hyphen, underscore only")
    .optional(),
  logoUrl: z.string().url().optional().nullable(),
  /** Link to a telehealth super-partner; omit or null for an independent corporate partner. */
  superPartnerId: z.string().uuid().nullable().optional(),
});

export async function GET() {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rows: any[];
    let hasSuperPartnerCol = true;

    try {
      rows = await prisma.superReferralPartner.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { partnerClients: true } },
          superPartner: { select: { id: true, name: true } },
        },
      });
    } catch {
      hasSuperPartnerCol = false;
      rows = await prisma.superReferralPartner.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { partnerClients: true } } },
      });
    }

    return NextResponse.json({
      success: true,
      data: rows.map((p) => ({
        id: p.id,
        name: p.name,
        logoUrl: p.logoUrl,
        contactEmail: p.contactEmail,
        contactName: p.contactName,
        referralSlug: p.referralSlug,
        monthlyPoolSize: p.monthlyPoolSize,
        poolApprovedAt: p.poolApprovedAt?.toISOString() ?? null,
        status: p.status,
        clientCount: p._count.partnerClients,
        createdAt: p.createdAt.toISOString(),
        superPartnerId: hasSuperPartnerCol ? (p.superPartnerId ?? null) : null,
        superPartnerName: hasSuperPartnerCol ? (p.superPartner?.name ?? null) : null,
      })),
    });
  } catch (e) {
    const { status, body } = partnerListErrorResponse(e);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let slug = parsed.data.referralSlug
    ? normalizeSuperReferralSlug(parsed.data.referralSlug)
    : slugFromPartnerName(parsed.data.name);

  if (!slug) {
    return NextResponse.json(
      { success: false, error: "Slug cannot be empty after normalizing" },
      { status: 400 },
    );
  }

  try {
    const spId = parsed.data.superPartnerId;
    if (spId) {
      const sp = await prisma.superPartner.findFirst({
        where: { id: spId, isActive: true },
        select: { id: true },
      });
      if (!sp) {
        return NextResponse.json(
          { success: false, error: "Super partner not found or inactive" },
          { status: 400 },
        );
      }
    }

    let n = 0;
    while (
      await prisma.superReferralPartner.findUnique({
        where: { referralSlug: slug },
        select: { id: true },
      })
    ) {
      n += 1;
      slug = `${slugFromPartnerName(parsed.data.name).slice(0, 20)}${n}`.slice(0, 32);
    }

    const row = await prisma.superReferralPartner.create({
      data: {
        name: parsed.data.name.trim(),
        contactEmail: parsed.data.contactEmail.trim().toLowerCase(),
        contactName: parsed.data.contactName.trim(),
        referralSlug: slug,
        logoUrl: parsed.data.logoUrl?.trim() || null,
        status: "pending_payment",
        ...(spId !== undefined ? { superPartnerId: spId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        referralSlug: row.referralSlug,
        logoUrl: row.logoUrl,
        contactEmail: row.contactEmail,
        contactName: row.contactName,
        status: row.status,
      },
    });
  } catch (e) {
    console.error("super-referral-partners POST:", e);
    captureApiError(e, { route: "/admin/super-referral-partners" });
    return NextResponse.json(
      { success: false, error: "Could not create partner" },
      { status: 500 },
    );
  }
}
