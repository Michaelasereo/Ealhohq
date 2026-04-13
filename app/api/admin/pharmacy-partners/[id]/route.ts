import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const patchBody = z.object({
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(5).optional(),
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

  try {
    const row = await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault === true) {
        await tx.pharmacyPartner.updateMany({
          where: { NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.pharmacyPartner.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(parsed.data.contactEmail
            ? { contactEmail: parsed.data.contactEmail.trim().toLowerCase() }
            : {}),
        },
      });
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
        isDefault: row.isDefault,
      },
    });
  } catch (e) {
    console.error("admin/pharmacy-partners PATCH:", e);
    captureApiError(e, { route: "/admin/pharmacy-partners/[id]" });
    return NextResponse.json(
      { success: false, error: "Could not update pharmacy partner" },
      { status: 500 },
    );
  }
}
