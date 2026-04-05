import { NextResponse } from "next/server";

import { tierFromBalance } from "@/lib/credits/purchase-config";
import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

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
      return NextResponse.json({
        success: true,
        data: { balance: 0, tier: tierFromBalance(0) },
      });
    }

    const credit = await prisma.therapyCredit.findUnique({
      where: { patientId: patient.id },
    });

    const balance = credit?.balance ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        balance,
        tier: tierFromBalance(balance),
      },
    });
  } catch (e) {
    console.error("patient/credits GET:", e);
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 },
    );
  }
}
