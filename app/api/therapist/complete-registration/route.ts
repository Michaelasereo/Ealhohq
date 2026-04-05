import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const bodySchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  bio: z.string().min(1),
  specializations: z.array(z.string()).min(1),
  qualifications: z.array(z.string()).min(1),
});

/**
 * After OTP, the auth user exists but Prisma `therapy_therapists` was never created.
 * Call this once with the enroll draft so admin can see pending applications.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role =
      (user.app_metadata?.role as string | undefined) ??
      (await prisma.sharedProfile.findUnique({
        where: { id: user.id },
        select: { role: true },
      }))?.role;

    if (role !== "therapist") {
      return NextResponse.json({ error: "Not a therapist account" }, { status: 403 });
    }

    const json = (await req.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid application data" },
        { status: 400 },
      );
    }
    const b = parsed.data;

    const existing = await prisma.therapyTherapist.findUnique({
      where: { profileId: user.id },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: { id: existing.id } });
    }

    await prisma.sharedProfile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        role: "therapist",
        fullName: b.fullName.trim(),
        phone: b.phone.trim(),
        status: "pending",
      },
      update: {
        role: "therapist",
        fullName: b.fullName.trim(),
        phone: b.phone.trim(),
        status: "pending",
      },
    });

    const therapist = await prisma.therapyTherapist.create({
      data: {
        profileId: user.id,
        bio: b.bio.trim(),
        specializations: b.specializations,
        qualifications: b.qualifications,
        sessionRate: new Prisma.Decimal(15000),
        sessionDuration: 50,
        status: "pending",
        profilePhoto: null,
      },
    });

    return NextResponse.json({ success: true, data: { id: therapist.id } });
  } catch (e) {
    console.error("therapist/complete-registration:", e);
    return NextResponse.json(
      { error: "Could not save therapist application" },
      { status: 500 },
    );
  }
}
