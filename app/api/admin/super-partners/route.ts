import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
function superPartnerListErrorResponse(e: unknown): {
  status: number;
  body: {
    success: false;
    error: string;
    meta?: { code?: string; detail?: string };
  };
} {
  console.error("super-partners GET:", e);
    captureApiError(e, { route: "/admin/super-partners" });

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021" || e.code === "P2010" || e.code === "P2022") {
      return {
        status: 503,
        body: {
          success: false,
          error:
            "Super partner tables are missing or out of date. Run: npx prisma migrate deploy (with DATABASE_URL and DIRECT_URL set).",
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
      error: "Failed to load super partners",
      ...(process.env.NODE_ENV === "development" && e instanceof Error
        ? { meta: { detail: e.message.slice(0, 300) } }
        : {}),
    },
  };
}

const createBody = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email().optional().nullable(),
  contactName: z.string().min(1).optional().nullable(),
});

export async function GET() {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const rows = await prisma.superPartner.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { corporatePartners: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        contactEmail: r.contactEmail,
        contactName: r.contactName,
        isActive: r.isActive,
        partnerCount: r._count.corporatePartners,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    const { status, body } = superPartnerListErrorResponse(e);
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

  try {
    const row = await prisma.superPartner.create({
      data: {
        name: parsed.data.name.trim(),
        contactEmail: parsed.data.contactEmail?.trim().toLowerCase() ?? null,
        contactName: parsed.data.contactName?.trim() ?? null,
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        contactEmail: row.contactEmail,
        contactName: row.contactName,
        isActive: row.isActive,
      },
    });
  } catch (e) {
    const { status, body } = superPartnerListErrorResponse(e);
    if (status !== 500) {
      return NextResponse.json(body, { status });
    }
    console.error("super-partners POST:", e);
    captureApiError(e, { route: "/admin/super-partners" });
    return NextResponse.json(
      { success: false, error: "Could not create super partner" },
      { status: 500 },
    );
  }
}
