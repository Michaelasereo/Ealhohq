import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const patchBody = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  mdcnRegistrationNumber: z.string().min(1).optional(),
  specialisation: z.string().min(1).optional(),
  sessionRate: z.number().positive().optional(),
  pharmacyPartnerId: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.pharmacyPartnerId) {
    const exists = await prisma.pharmacyPartner.findUnique({
      where: { id: parsed.data.pharmacyPartnerId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "Pharmacy partner not found" },
        { status: 400 },
      );
    }
  }

  try {
    const row = await prisma.psychiatrist.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.email
          ? { email: parsed.data.email.trim().toLowerCase() }
          : {}),
      },
    });
    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        mdcnRegistrationNumber: row.mdcnRegistrationNumber,
        specialisation: row.specialisation,
        sessionRate: Number(row.sessionRate),
        pharmacyPartnerId: row.pharmacyPartnerId,
        isActive: row.isActive,
      },
    });
  } catch (e) {
    console.error("admin/psychiatrists PATCH:", e);
    captureApiError(e, { route: "/admin/psychiatrists/[id]" });
    return NextResponse.json(
      { success: false, error: "Could not update psychiatrist" },
      { status: 500 },
    );
  }
}
