import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function POST(req: Request) {
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

    const body = (await req.json()) as {
      date?: string;
      isBlocked?: boolean;
      startTime?: string | null;
      endTime?: string | null;
      reason?: string | null;
    };

    if (!body.date?.trim()) {
      return NextResponse.json({ error: "date required" }, { status: 400 });
    }

    const isBlocked = body.isBlocked !== false;
    if (!isBlocked && (!body.startTime?.trim() || !body.endTime?.trim())) {
      return NextResponse.json(
        { error: "startTime and endTime required when not blocking" },
        { status: 400 },
      );
    }

    const override = await prisma.therapyAvailabilityOverride.create({
      data: {
        therapistId: therapist.id,
        date: new Date(`${body.date.trim()}T12:00:00+01:00`),
        isBlocked,
        startTime: isBlocked ? null : body.startTime?.trim() ?? null,
        endTime: isBlocked ? null : body.endTime?.trim() ?? null,
        reason: body.reason?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: override });
  } catch (e) {
    console.error("therapist/availability/overrides POST:", e);
    captureApiError(e, { route: "/therapist/availability/overrides" });
    return NextResponse.json(
      { error: "Failed to save override" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
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

    const body = (await req.json().catch(() => ({}))) as {
      overrideId?: string;
    };
    if (!body.overrideId?.trim()) {
      return NextResponse.json({ error: "overrideId required" }, { status: 400 });
    }

    const deleted = await prisma.therapyAvailabilityOverride.deleteMany({
      where: {
        id: body.overrideId.trim(),
        therapistId: therapist.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("therapist/availability/overrides DELETE:", e);
    captureApiError(e, { route: "/therapist/availability/overrides" });
    return NextResponse.json(
      { error: "Failed to delete override" },
      { status: 500 },
    );
  }
}
