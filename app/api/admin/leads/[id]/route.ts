import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminUser } from "@/lib/auth/is-admin";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

import { captureApiError } from "@/lib/sentry/capture";
const patchSchema = z.object({
  contacted: z.boolean(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const json: unknown = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const updated = await prisma.clinicLead.update({
      where: { id },
      data: { contacted: parsed.data.contacted },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("admin leads PATCH:", e);
    captureApiError(e, { route: "/admin/leads/[id]" });
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}
