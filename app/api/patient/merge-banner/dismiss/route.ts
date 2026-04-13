import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.sharedProfile.update({
      where: { id: user.id },
      data: {
        guestMergeCompleted: true,
        guestMergeBannerPending: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("merge-banner dismiss:", e);
    captureApiError(e, { route: "/patient/merge-banner/dismiss" });
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 },
    );
  }
}
