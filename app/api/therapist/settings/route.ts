import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const patchSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    phone: z.string().nullable().optional(),
    bio: z.string().nullable().optional(),
    specializations: z.array(z.string()).optional(),
    qualifications: z.array(z.string()).optional(),
    profileStatus: z.enum(["active", "inactive"]).optional(),
  })
  .strict();

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = (await req.json()) as Record<string, unknown>;
    const {
      sessionRate: _sr,
      sessionDuration: _sd,
      ...rest
    } = raw;
    const parsed = patchSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      if (
        body.fullName !== undefined ||
        body.phone !== undefined ||
        body.profileStatus !== undefined
      ) {
        await tx.sharedProfile.update({
          where: { id: therapist.profileId },
          data: {
            ...(body.fullName !== undefined && { fullName: body.fullName.trim() }),
            ...(body.phone !== undefined && { phone: body.phone }),
            ...(body.profileStatus !== undefined && {
              status: body.profileStatus,
            }),
          },
        });
      }

      const therapistData: Prisma.TherapyTherapistUpdateInput = {};
      if (body.bio !== undefined) therapistData.bio = body.bio;
      if (body.specializations !== undefined) {
        therapistData.specializations = body.specializations;
      }
      if (body.qualifications !== undefined) {
        therapistData.qualifications = body.qualifications;
      }

      if (Object.keys(therapistData).length > 0) {
        await tx.therapyTherapist.update({
          where: { id: therapist.id },
          data: therapistData,
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("therapist/settings PATCH:", e);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
