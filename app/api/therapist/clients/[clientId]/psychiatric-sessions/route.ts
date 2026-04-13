import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
type Ctx = { params: Promise<{ clientId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { clientId: patientId } = await ctx.params;

    const rows = await prisma.psychiatricSession.findMany({
      where: {
        patientId,
        status: "completed",
        referral: { therapistId: therapist.id },
      },
      orderBy: { completedAt: "desc" },
      include: {
        prescriptions: true,
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        completedAt: r.completedAt?.toISOString() ?? null,
        summaryForTherapist: r.summaryForTherapist,
        patientConsentedToShareNotes: r.patientConsentedToShareNotes,
        sessionNotes: r.patientConsentedToShareNotes ? r.sessionNotes : null,
        prescriptions: r.prescriptions.map((p) => ({
          medicationName: p.medicationName,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
        })),
      })),
    });
  } catch (e) {
    console.error("therapist/clients/.../psychiatric-sessions GET:", e);
    captureApiError(e, { route: "/therapist/clients/[clientId]/psychiatric-sessions" });
    return NextResponse.json(
      { success: false, error: "Failed to load" },
      { status: 500 },
    );
  }
}
