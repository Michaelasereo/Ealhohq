import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const patchBody = z.object({
  name: z.string().min(1).optional(),
  contactEmail: z.union([z.string(), z.null()]).optional(),
  contactName: z.union([z.string(), z.null()]).optional(),
  isActive: z.boolean().optional(),
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

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  try {
    const data: {
      name?: string;
      contactEmail?: string | null;
      contactName?: string | null;
      isActive?: boolean;
    } = {};

    if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();

    if (parsed.data.contactName !== undefined) {
      if (parsed.data.contactName === null) {
        data.contactName = null;
      } else {
        const t = parsed.data.contactName.trim();
        data.contactName = t === "" ? null : t;
      }
    }

    if (parsed.data.contactEmail !== undefined) {
      if (parsed.data.contactEmail === null) {
        data.contactEmail = null;
      } else {
        const t = parsed.data.contactEmail.trim();
        if (t === "") {
          data.contactEmail = null;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
          return NextResponse.json(
            { success: false, error: "Invalid contact email" },
            { status: 400 },
          );
        } else {
          data.contactEmail = t.toLowerCase();
        }
      }
    }

    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

    const row = await prisma.superPartner.update({
      where: { id },
      data,
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
    console.error("super-partners PATCH:", e);
    captureApiError(e, { route: "/admin/super-partners/[id]" });
    return NextResponse.json(
      { success: false, error: "Could not update super partner" },
      { status: 500 },
    );
  }
}
