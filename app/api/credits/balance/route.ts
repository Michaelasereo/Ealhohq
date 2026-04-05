import { NextResponse } from "next/server";

import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { tierFromBalance } from "@/lib/credits/purchase-config";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await getPatientByProfileId(user.id);
    if (!patient) {
      return NextResponse.json(
        { success: true, data: { balance: 0, tier: "bronze", transactions: [] } },
      );
    }

    const credit = await prisma.therapyCredit.findUnique({
      where: { patientId: patient.id },
    });

    const txs = await prisma.therapyCreditTransaction.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const balance = credit?.balance ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        balance,
        tier: tierFromBalance(balance),
        transactions: txs.map((t) => ({
          id: t.id,
          date: t.createdAt.toISOString(),
          type: t.type,
          amount: t.amount,
          reference: t.reference,
        })),
      },
    });
  } catch (e) {
    console.error("credits/balance:", e);
    return NextResponse.json(
      { error: "Failed to load credits" },
      { status: 500 },
    );
  }
}
