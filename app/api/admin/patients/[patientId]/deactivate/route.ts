import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

type Ctx = { params: Promise<{ patientId: string }> };

export async function PUT(_req: Request, ctx: Ctx) {
  try {
    const { patientId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await prisma.therapyPatient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (patient.profileId) {
      await prisma.sharedProfile.update({
        where: { id: patient.profileId },
        data: { status: "inactive" },
      });

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && serviceKey) {
        const adminSupabase = createAdminClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: existing, error: getErr } =
          await adminSupabase.auth.admin.getUserById(patient.profileId);
        if (!getErr && existing.user) {
          const prevMeta =
            (existing.user.app_metadata as Record<string, unknown> | undefined) ??
            {};
          await adminSupabase.auth.admin.updateUserById(patient.profileId, {
            app_metadata: {
              ...prevMeta,
              status: "inactive",
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Deactivate patient:", e);
    return NextResponse.json(
      { error: "Failed to deactivate patient" },
      { status: 500 },
    );
  }
}
