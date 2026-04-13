import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const createSchema = z
  .object({
    code: z.string().min(2).max(40),
    discountType: z.enum(["percentage", "fixed", "full"]),
    discountValue: z.number().nonnegative().optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    /** `YYYY-MM-DD` — expires end of that calendar day (WAT). */
    expiresDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const codes = await prisma.discountCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { uses: true } } },
    });

    const data = codes.map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      bookingUseCount: c._count.uses,
      expiresAt: c.expiresAt?.toISOString() ?? null,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("admin/discounts GET:", e);
    captureApiError(e, { route: "/admin/discounts" });
    return NextResponse.json(
      { error: "Failed to load discount codes" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      code,
      discountType,
      discountValue: rawValue,
      maxUses,
      expiresDate,
      isActive,
    } = parsed.data;

    const normalized = code.toUpperCase().trim();
    let value = rawValue ?? 0;
    if (discountType === "full") {
      value = 100;
    } else if (discountType === "percentage") {
      if (!(value > 0)) {
        return NextResponse.json(
          { error: "Percentage discount needs a value between 1 and 100" },
          { status: 400 },
        );
      }
      if (value > 100) {
        return NextResponse.json(
          { error: "Percentage cannot exceed 100" },
          { status: 400 },
        );
      }
    } else if (discountType === "fixed") {
      if (!(value > 0)) {
        return NextResponse.json(
          { error: "Fixed discount needs a positive NGN amount" },
          { status: 400 },
        );
      }
    }

    const expiresAt =
      expiresDate != null && expiresDate !== ""
        ? new Date(`${expiresDate}T23:59:59+01:00`)
        : null;

    const created = await prisma.discountCode.create({
      data: {
        code: normalized,
        discountType,
        discountValue: new Prisma.Decimal(String(value)),
        maxUses: maxUses ?? null,
        expiresAt,
        isActive: isActive ?? true,
        createdBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: created.id, code: created.code },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A code with this value already exists" },
        { status: 409 },
      );
    }
    console.error("admin/discounts POST:", e);
    captureApiError(e, { route: "/admin/discounts" });
    return NextResponse.json(
      { error: "Failed to create discount code" },
      { status: 500 },
    );
  }
}
