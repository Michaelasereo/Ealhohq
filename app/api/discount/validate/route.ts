import { NextResponse } from "next/server";

import { computeDiscountForSession } from "@/lib/discount/compute";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      code?: string;
      amount?: number;
    };
    const codeRaw = typeof body.code === "string" ? body.code.trim() : "";
    const amount =
      typeof body.amount === "number" && Number.isFinite(body.amount)
        ? body.amount
        : NaN;
    if (!codeRaw || !Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { success: false, error: "code and amount required" },
        { status: 400 },
      );
    }

    const normalized = codeRaw.toUpperCase();
    const discount = await prisma.discountCode.findFirst({
      where: { code: normalized, isActive: true },
    });

    if (!discount) {
      return NextResponse.json(
        { success: false, error: "Invalid discount code" },
        { status: 400 },
      );
    }

    if (discount.expiresAt && discount.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This discount code has expired" },
        { status: 400 },
      );
    }

    if (
      discount.maxUses != null &&
      discount.usedCount >= discount.maxUses
    ) {
      return NextResponse.json(
        { success: false, error: "This discount code has reached its limit" },
        { status: 400 },
      );
    }

    const { discountAmount, finalAmount, isFree } = computeDiscountForSession(
      amount,
      discount,
    );

    return NextResponse.json({
      success: true,
      data: {
        code: discount.code,
        discountType: discount.discountType,
        discountValue: Number(discount.discountValue),
        discountAmount,
        finalAmount,
        isFree,
      },
    });
  } catch (e) {
    console.error("discount/validate POST:", e);
    return NextResponse.json(
      { success: false, error: "Failed to validate code" },
      { status: 500 },
    );
  }
}
