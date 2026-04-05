import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

type Ctx = { params: Promise<{ patientId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientId } = await ctx.params;
    const body = (await req.json()) as { amount?: number };
    const amount = Math.floor(Number(body.amount ?? 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Positive amount required" },
        { status: 400 },
      );
    }

    const patient = await prisma.therapyPatient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    await prisma.therapyCredit.upsert({
      where: { patientId },
      create: { patientId, balance: amount, tier: "bronze" },
      update: { balance: { increment: amount } },
    });

    await prisma.therapyCreditTransaction.create({
      data: {
        patientId,
        amount,
        type: "admin_grant",
        reference: `admin:${user.id}`,
      },
    });

    const updated = await prisma.therapyCredit.findUnique({
      where: { patientId },
    });

    return NextResponse.json({
      success: true,
      data: { balance: updated?.balance ?? amount },
    });
  } catch (e) {
    console.error("admin patient credits:", e);
    return NextResponse.json(
      { error: "Failed to add credits" },
      { status: 500 },
    );
  }
}
