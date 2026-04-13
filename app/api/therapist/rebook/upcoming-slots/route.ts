import { NextResponse } from "next/server";

import { getAvailableSlots } from "@/lib/availability/slots";
import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { addWatDays, watTodayDateString } from "@/lib/wat-datetime";

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

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = watTodayDateString();
    const days: { ymd: string; slots: string[] }[] = [];
    for (let i = 1; i <= 14; i++) {
      const ymd = addWatDays(today, i);
      const slots = await getAvailableSlots(therapist.id, ymd);
      if (slots.length > 0) {
        days.push({ ymd, slots });
      }
    }

    return NextResponse.json({ success: true, data: { days } });
  } catch (e) {
    console.error("rebook upcoming-slots:", e);
    captureApiError(e, { route: "/therapist/rebook/upcoming-slots" });
    return NextResponse.json(
      { error: "Failed to load slots" },
      { status: 500 },
    );
  }
}
