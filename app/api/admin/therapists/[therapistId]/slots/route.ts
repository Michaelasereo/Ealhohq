import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { getAvailableSlots } from "@/lib/availability/slots";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type Ctx = { params: Promise<{ therapistId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { therapistId } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const dateStr = (searchParams.get("date") ?? "").trim();
    if (!DATE_RE.test(dateStr)) {
      return NextResponse.json({ error: "date (YYYY-MM-DD) required" }, { status: 400 });
    }

    const slots = await getAvailableSlots(therapistId, dateStr);
    return NextResponse.json({ success: true, data: slots });
  } catch (e) {
    console.error("admin therapist slots:", e);
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
  }
}
