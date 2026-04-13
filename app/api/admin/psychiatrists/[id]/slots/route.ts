import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { slotsForPsychiatristDay } from "@/lib/psychiatry/slots-for-date";
import { prisma } from "@/lib/prisma/client";
import { watDayStart } from "@/lib/wat-datetime";

import { captureApiError } from "@/lib/sentry/capture";
type Ctx = { params: Promise<{ id: string }> };

/**
 * GET ?date=YYYY-MM-DD — candidate slot start times for a psychiatrist (WAT),
 * excluding times already taken by another psychiatric booking on that day.
 */
export async function GET(req: Request, ctx: Ctx) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { id: psychiatristId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date")?.trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { success: false, error: "date=YYYY-MM-DD required" },
      { status: 400 },
    );
  }

  try {
    const psychiatrist = await prisma.psychiatrist.findFirst({
      where: { id: psychiatristId, isActive: true },
    });
    if (!psychiatrist) {
      return NextResponse.json(
        { success: false, error: "Psychiatrist not found" },
        { status: 404 },
      );
    }

    const schedules = await prisma.psychiatristAvailabilitySchedule.findMany({
      where: { psychiatristId, isActive: true },
    });

    const raw = slotsForPsychiatristDay(
      date,
      schedules.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        sessionDurationMinutes: s.sessionDurationMinutes,
        bufferMinutes: s.bufferMinutes,
        isActive: s.isActive,
      })),
    );

    const dayStart = watDayStart(date);
    const dayEnd = new Date(dayStart.getTime() + 86400_000);

    const taken = await prisma.therapyBooking.findMany({
      where: {
        sessionType: "psychiatric_assessment",
        status: { in: ["pending", "confirmed"] },
        date: { gte: dayStart, lt: dayEnd },
        psychiatricSession: { psychiatristId },
      },
      select: { startTime: true },
    });
    const takenSet = new Set(taken.map((t) => t.startTime));

    const slots = raw.filter((s) => !takenSet.has(s));

    return NextResponse.json({
      success: true,
      data: {
        slots,
        sessionDurationMinutes: psychiatrist.sessionDuration ?? 60,
      },
    });
  } catch (e) {
    console.error("admin/psychiatrists/[id]/slots GET:", e);
    captureApiError(e, { route: "/admin/psychiatrists/[id]/slots" });
    return NextResponse.json(
      { success: false, error: "Failed to load slots" },
      { status: 500 },
    );
  }
}
