import { NextResponse } from "next/server";

import { formatNaira } from "@/lib/format/currency";
import { getTherapistById } from "@/lib/queries/therapists";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

type Ctx = { params: Promise<{ id: string }> };

function serializeTherapist(
  t: NonNullable<Awaited<ReturnType<typeof getTherapistById>>>,
) {
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
    availabilityOverrides: t.availabilityOverrides.map((o) => ({
      ...o,
      date: o.date.toISOString(),
    })),
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const therapist = await getTherapistById(id, { approvedOnly: true });
    if (!therapist) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Therapist not found",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: serializeTherapist(therapist),
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to fetch therapist",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
