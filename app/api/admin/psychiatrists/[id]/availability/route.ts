import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const rowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  sessionDurationMinutes: z.number().int().min(15).max(120).optional(),
  bufferMinutes: z.number().int().min(0).max(60).optional(),
  isActive: z.boolean().optional(),
});

const bodySchema = z.object({
  schedule: z.array(rowSchema),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { id } = await ctx.params;

  try {
    const rows = await prisma.psychiatristAvailabilitySchedule.findMany({
      where: { psychiatristId: id },
      orderBy: { dayOfWeek: "asc" },
    });
    return NextResponse.json({ success: true, data: { schedule: rows } });
  } catch (e) {
    console.error("admin/psychiatrists/[id]/availability GET:", e);
    captureApiError(e, { route: "/admin/psychiatrists/[id]/availability" });
    return NextResponse.json(
      { success: false, error: "Failed to load availability" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const exists = await prisma.psychiatrist.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "Psychiatrist not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction([
      prisma.psychiatristAvailabilitySchedule.deleteMany({
        where: { psychiatristId: id },
      }),
      prisma.psychiatristAvailabilitySchedule.createMany({
        data: parsed.data.schedule.map((r) => ({
          psychiatristId: id,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          sessionDurationMinutes: r.sessionDurationMinutes ?? 60,
          bufferMinutes: r.bufferMinutes ?? 15,
          isActive: r.isActive ?? true,
        })),
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin/psychiatrists/[id]/availability POST:", e);
    captureApiError(e, { route: "/admin/psychiatrists/[id]/availability" });
    return NextResponse.json(
      { success: false, error: "Could not save availability" },
      { status: 500 },
    );
  }
}
