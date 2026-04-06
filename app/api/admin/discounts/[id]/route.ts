import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const patchSchema = z
  .object({
    isActive: z.boolean().optional(),
    discountType: z.enum(["percentage", "fixed", "full"]).optional(),
    discountValue: z.number().nonnegative().optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    expiresDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
  })
  .strict();

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.discountCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const u = parsed.data;
    const data: Prisma.DiscountCodeUpdateInput = {};
    if (u.isActive !== undefined) data.isActive = u.isActive;
    if (u.discountType !== undefined) data.discountType = u.discountType;
    if (u.discountValue !== undefined) {
      data.discountValue = new Prisma.Decimal(String(u.discountValue));
    }
    if (u.maxUses !== undefined) data.maxUses = u.maxUses;
    if (u.expiresDate !== undefined) {
      data.expiresAt =
        u.expiresDate != null && u.expiresDate !== ""
          ? new Date(`${u.expiresDate}T23:59:59+01:00`)
          : null;
    }

    await prisma.discountCode.update({ where: { id }, data });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin/discounts PATCH:", e);
    return NextResponse.json(
      { error: "Failed to update discount code" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const existing = await prisma.discountCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.discountCode.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin/discounts DELETE:", e);
    return NextResponse.json(
      { error: "Failed to delete discount code" },
      { status: 500 },
    );
  }
}
