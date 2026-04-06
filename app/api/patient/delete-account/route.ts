import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { confirm?: string };
    if (body.confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Confirmation must be the word "DELETE"' },
        { status: 400 },
      );
    }

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
        { error: "Client profile not found" },
        { status: 404 },
      );
    }

    const uid = user.id;
    const anonEmail = `deleted_${patient.id.slice(0, 8)}@anon.ealho.local`;
    const anonName = "Deleted user";

    await prisma.$transaction([
      prisma.therapyPatient.update({
        where: { id: patient.id },
        data: {
          fullName: anonName,
          email: anonEmail,
          phone: "",
          dateOfBirth: null,
          gender: null,
          occupation: null,
        },
      }),
      prisma.sharedProfile.update({
        where: { id: uid },
        data: {
          fullName: anonName,
          phone: null,
          status: "inactive",
        },
      }),
    ]);

    try {
      const admin = createServiceRoleClient();
      await admin.auth.admin.updateUserById(uid, {
        email: anonEmail,
        user_metadata: {
          ...(user.user_metadata as object),
          full_name: anonName,
        },
        app_metadata: {
          ...(user.app_metadata as object),
          status: "inactive",
        },
      });
    } catch (e) {
      console.error("delete-account auth update:", e);
    }

    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("client delete-account:", e);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
