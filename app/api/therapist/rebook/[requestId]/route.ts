import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { bookingDateStartToIso } from "@/lib/wat-datetime";

type Ctx = { params: Promise<{ requestId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { requestId } = await ctx.params;
    const reqRow = await prisma.therapyRebookingRequest.findUnique({
      where: { id: requestId },
      include: {
        therapist: { include: { profile: true } },
      },
    });

    if (!reqRow) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    }

    const now = new Date();
    const expired = reqRow.expiresAt < now;
    const therapistName = reqRow.therapist.profile.fullName;
    const photo =
      reqRow.therapist.profilePhoto ?? "/Ealho-logo.png";
    const startIso = bookingDateStartToIso(
      reqRow.suggestedDate,
      reqRow.suggestedTime,
    );

    return NextResponse.json({
      success: true,
      data: {
        status: reqRow.status,
        expired,
        therapistName,
        therapistPhoto: photo,
        sessionDuration: reqRow.therapist.sessionDuration,
        sessionType: reqRow.sessionType,
        suggestedDate: reqRow.suggestedDate.toISOString(),
        suggestedTime: reqRow.suggestedTime,
        startIso,
        expiresAt: reqRow.expiresAt.toISOString(),
        sessionRateNgn: Math.round(Number(reqRow.therapist.sessionRate)),
      },
    });
  } catch (e) {
    console.error("rebook request GET:", e);
    return NextResponse.json(
      { success: false, error: "Failed to load" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { requestId } = await ctx.params;
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

    const row = await prisma.therapyRebookingRequest.findFirst({
      where: { id: requestId, therapistId: therapist.id },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.therapyRebookingRequest.update({
      where: { id: requestId },
      data: { status: "cancelled", respondedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("rebook request DELETE:", e);
    return NextResponse.json(
      { error: "Failed to cancel" },
      { status: 500 },
    );
  }
}
