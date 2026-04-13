import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function requirePsychiatristUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      psychiatrist: null,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "psychiatrist") {
    return {
      user: null,
      psychiatrist: null,
      response: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }

  const psychiatrist = await prisma.psychiatrist.findFirst({
    where: { profileId: user.id },
  });

  if (!psychiatrist) {
    return {
      user,
      psychiatrist: null,
      response: NextResponse.json(
        { success: false, error: "Psychiatrist profile not linked" },
        { status: 403 },
      ),
    };
  }

  return { user, psychiatrist, response: null };
}
