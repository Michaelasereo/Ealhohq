import { NextResponse } from "next/server";

import { formatNaira } from "@/lib/format/currency";
import { getApprovedTherapists } from "@/lib/queries/therapists";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

function serializeTherapist(t: Awaited<ReturnType<typeof getApprovedTherapists>>[number]) {
  return {
    id: t.id,
    profileId: t.profileId,
    bio: t.bio,
    specializations: t.specializations,
    qualifications: t.qualifications,
    profilePhoto: t.profilePhoto,
    status: t.status,
    sessionRate: Number(t.sessionRate),
    sessionRateFormatted: formatNaira(t.sessionRate),
    sessionDuration: t.sessionDuration,
    createdAt: t.createdAt.toISOString(),
    profile: {
      ...t.profile,
      fullName: therapistPublicLabel(t.profile.fullName),
    },
    availabilitySchedule: t.availabilitySchedule,
  };
}

export async function GET() {
  try {
    const therapists = await getApprovedTherapists();
    return NextResponse.json({
      success: true,
      data: therapists.map(serializeTherapist),
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to fetch therapists",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
