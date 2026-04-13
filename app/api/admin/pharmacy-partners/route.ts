import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const createBody = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  contactPerson: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(5),
});

export async function GET() {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  try {
    const rows = await prisma.pharmacyPartner.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      success: true,
      data: rows.map((p) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        contactPerson: p.contactPerson,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("admin/pharmacy-partners GET:", e);
    captureApiError(e, { route: "/admin/pharmacy-partners" });
    return NextResponse.json(
      { success: false, error: "Failed to load pharmacy partners" },
      { status: 500 },
    );
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
    const row = await prisma.pharmacyPartner.create({
      data: {
        id: randomUUID(),
        name: parsed.data.name.trim(),
        location: parsed.data.location.trim(),
        contactPerson: parsed.data.contactPerson.trim(),
        contactEmail: parsed.data.contactEmail.trim().toLowerCase(),
        contactPhone: parsed.data.contactPhone.trim(),
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        location: row.location,
        contactPerson: row.contactPerson,
        contactEmail: row.contactEmail,
        contactPhone: row.contactPhone,
        isActive: row.isActive,
      },
    });
  } catch (e) {
    console.error("admin/pharmacy-partners POST:", e);
    captureApiError(e, { route: "/admin/pharmacy-partners" });
    return NextResponse.json(
      { success: false, error: "Could not create pharmacy partner" },
      { status: 500 },
    );
  }
}
