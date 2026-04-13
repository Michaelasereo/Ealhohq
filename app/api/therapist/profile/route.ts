import { NextResponse } from "next/server";
import { z } from "zod";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const patchSchema = z
  .object({
    profilePhoto: z.string().url().nullable().optional(),
    bio: z.string().nullable().optional(),
    specializations: z.array(z.string()).optional(),
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

    const updated = await prisma.therapyTherapist.update({
      where: { id: therapist.id },
      data: {
        ...(body.profilePhoto !== undefined && { profilePhoto: body.profilePhoto }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.specializations !== undefined && {
          specializations: body.specializations,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("therapist/profile PATCH:", e);
    captureApiError(e, { route: "/therapist/profile" });
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
