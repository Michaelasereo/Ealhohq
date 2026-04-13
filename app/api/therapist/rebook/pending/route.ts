import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { bookingDateStartToIso } from "@/lib/wat-datetime";

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

    const now = new Date();
    const rows = await prisma.therapyRebookingRequest.findMany({
      where: {
        therapistId: therapist.id,
        status: "pending",
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      include: {
        patient: true,
      },
    });

    const data = rows.map((r) => {
      const sentMs = now.getTime() - r.createdAt.getTime();
      const sentHours = Math.max(0, Math.floor(sentMs / (1000 * 60 * 60)));
      const expMs = r.expiresAt.getTime() - now.getTime();
      const expiresHours = Math.max(0, Math.ceil(expMs / (1000 * 60 * 60)));
      return {
        id: r.id,
        patientName: r.patient.fullName,
        suggestedDate: r.suggestedDate.toISOString(),
        suggestedTime: r.suggestedTime,
        dateTimeIso: bookingDateStartToIso(r.suggestedDate, r.suggestedTime),
        sentHoursAgo: sentHours,
        expiresInHours: expiresHours,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("rebook pending GET:", e);
    captureApiError(e, { route: "/therapist/rebook/pending" });
    return NextResponse.json(
      { error: "Failed to load" },
      { status: 500 },
    );
  }
}
