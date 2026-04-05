import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const patchSchema = z.object({
  sessionRate: z.number().positive(),
  sessionDuration: z.union([z.literal(50), z.literal(60), z.literal(90)]),
});

type Ctx = { params: Promise<{ therapistId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { therapistId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = (await req.json()) as unknown;
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { sessionRate, sessionDuration } = parsed.data;

    const updated = await prisma.therapyTherapist.update({
      where: { id: therapistId },
      data: {
        sessionRate: new Prisma.Decimal(sessionRate),
        sessionDuration,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionRate: Number(updated.sessionRate),
        sessionDuration: updated.sessionDuration,
      },
    });
  } catch (e) {
    console.error("admin/therapists/[therapistId] PATCH:", e);
    return NextResponse.json(
      { error: "Failed to update therapist" },
      { status: 500 },
    );
  }
}
