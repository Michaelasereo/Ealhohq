import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";

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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: therapist.id,
        fullName: therapist.profile.fullName,
        email: user.email ?? null,
        profilePhoto: therapist.profilePhoto,
        bio: therapist.bio,
        specializations: therapist.specializations,
        qualifications: therapist.qualifications,
        sessionRate: Number(therapist.sessionRate),
        sessionDuration: therapist.sessionDuration,
        phone: therapist.profile.phone,
        status: therapist.status,
      },
    });
  } catch (e) {
    console.error("therapist/profile/me GET:", e);
    captureApiError(e, { route: "/therapist/profile/me" });
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    );
  }
}
