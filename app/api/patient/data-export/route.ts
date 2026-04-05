import { NextResponse } from "next/server";

import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

export async function POST() {
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
        { error: "Patient profile not found" },
        { status: 404 },
      );
    }

    const profile = await prisma.sharedProfile.findUnique({
      where: { id: user.id },
    });

    const bookings = await prisma.therapyBooking.findMany({
      where: { patientId: patient.id },
      orderBy: { date: "desc" },
      take: 500,
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        sessionType: true,
        paymentStatus: true,
        createdAt: true,
        therapist: {
          select: { profile: { select: { fullName: true } } },
        },
      },
    });

    const credits = await prisma.therapyCredit.findUnique({
      where: { patientId: patient.id },
    });

    const transactions = await prisma.therapyCreditTransaction.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        fullName: patient.fullName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        occupation: patient.occupation,
        accountEmail: user.email,
        profileStatus: profile?.status,
      },
      bookings,
      credits: credits
        ? { balance: credits.balance, tier: credits.tier }
        : null,
      creditTransactions: transactions,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    console.error("patient data-export:", e);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 },
    );
  }
}
