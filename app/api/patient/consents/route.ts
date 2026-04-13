import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.consentRecord.findMany({
      where: { userId: user.id },
      orderBy: { consentedAt: "desc" },
      select: {
        consentType: true,
        consentedAt: true,
        version: true,
      },
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    console.error("client consents GET:", e);
    captureApiError(e, { route: "/patient/consents" });
    return NextResponse.json(
      { error: "Failed to load consents" },
      { status: 500 },
    );
  }
}
