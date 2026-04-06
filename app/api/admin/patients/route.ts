import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patients = await prisma.therapyPatient.findMany({
      include: {
        profile: true,
        credits: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ success: true, data: patients });
  } catch (e) {
    console.error("admin clients list GET:", e);
    return NextResponse.json(
      { error: "Failed to load patients" },
      { status: 500 },
    );
  }
}
