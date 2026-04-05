import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contactedParam = searchParams.get("contacted");

    const where =
      contactedParam === "true"
        ? { contacted: true }
        : contactedParam === "false"
          ? { contacted: false }
          : {};

    const leads = await prisma.clinicLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (e) {
    console.error("admin leads GET:", e);
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 },
    );
  }
}
