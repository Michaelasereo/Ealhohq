import { NextResponse } from "next/server";

import { resolveAppRole } from "@/lib/auth/resolve-app-role";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

import { captureApiError } from "@/lib/sentry/capture";
export const runtime = "nodejs";

export type MessagingTherapistRow = {
  id: string;
  name: string;
  photo: string;
};

/**
 * Therapists the client can message: at least one confirmed or completed booking
 * (matches POST /api/chat/threads for patients).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await resolveAppRole(user.id);
    if (role !== "patient") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
    if (!patient) {
      return NextResponse.json({
        success: true,
        data: { therapists: [] satisfies MessagingTherapistRow[] },
      });
    }

    const bookings = await prisma.therapyBooking.findMany({
      where: {
        patientId: patient.id,
        status: { in: ["confirmed", "completed"] },
      },
      include: {
        therapist: {
          include: {
            profile: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
    });

    const byTherapist = new Map<
      string,
      { id: string; name: string; photo: string }
    >();
    for (const b of bookings) {
      const tid = b.therapistId;
      if (byTherapist.has(tid)) continue;
      byTherapist.set(tid, {
        id: b.therapist.id,
        name: therapistPublicLabel(b.therapist.profile.fullName),
        photo: b.therapist.profilePhoto ?? "/Ealho-logo.png",
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        therapists: [...byTherapist.values()] satisfies MessagingTherapistRow[],
      },
    });
  } catch (e) {
    console.error("patient/messaging/therapists GET:", e);
    captureApiError(e, { route: "/patient/messaging/therapists" });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
