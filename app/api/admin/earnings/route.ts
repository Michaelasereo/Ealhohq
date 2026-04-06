import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { isAdminUser } from "@/lib/auth/is-admin";
import {
  DEFAULT_PLATFORM_PERCENT,
  DEFAULT_THERAPIST_PERCENT,
} from "@/lib/defaults/earnings-split";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const postSchema = z
  .object({
    therapistId: z.string().uuid(),
    therapistPercent: z.number().min(0).max(100),
    notes: z.string().max(500).optional().nullable(),
  })
  .strict();

/** List approved therapists with earnings split and paid completed totals. */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionAgg = await prisma.therapySession.groupBy({
      by: ["therapistId"],
      where: {
        status: "completed",
        booking: { paymentStatus: "paid" },
      },
      _sum: { therapistEarnings: true },
      _count: { _all: true },
    });

    const aggByTherapist = new Map<
      string,
      { totalEarnings: number; paidCompletedSessions: number }
    >(
      sessionAgg.map((r) => [
        r.therapistId,
        {
          totalEarnings: r._sum.therapistEarnings
            ? Number(r._sum.therapistEarnings)
            : 0,
          paidCompletedSessions: r._count._all,
        },
      ]),
    );

    const therapists = await prisma.therapyTherapist.findMany({
      where: { status: "approved" },
      include: {
        profile: { select: { fullName: true } },
        earningsConfig: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const data = therapists.map((t) => {
      const cfg = t.earningsConfig;
      const therapistPercent = cfg
        ? Number(cfg.therapistPercent)
        : DEFAULT_THERAPIST_PERCENT;
      const platformPercent = cfg
        ? Number(cfg.platformPercent)
        : DEFAULT_PLATFORM_PERCENT;
      const agg = aggByTherapist.get(t.id);
      return {
        therapistId: t.id,
        therapistName: t.profile.fullName,
        sessionRate: Number(t.sessionRate),
        therapistPercent,
        platformPercent,
        totalTherapistEarnings: agg?.totalEarnings ?? 0,
        paidCompletedSessions: agg?.paidCompletedSessions ?? 0,
        notes: cfg?.notes ?? null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("admin/earnings GET:", e);
    return NextResponse.json(
      { error: "Failed to load earnings config" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { therapistId, therapistPercent, notes } = parsed.data;
    const platformPercent = Math.round((100 - therapistPercent) * 100) / 100;

    const exists = await prisma.therapyTherapist.findUnique({
      where: { id: therapistId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Therapist not found" }, { status: 404 });
    }

    await prisma.earningsConfig.upsert({
      where: { therapistId },
      create: {
        therapistId,
        therapistPercent: new Prisma.Decimal(String(therapistPercent)),
        platformPercent: new Prisma.Decimal(String(platformPercent)),
        setByAdminId: user.id,
        notes: notes?.trim() || null,
      },
      update: {
        therapistPercent: new Prisma.Decimal(String(therapistPercent)),
        platformPercent: new Prisma.Decimal(String(platformPercent)),
        setByAdminId: user.id,
        notes: notes?.trim() ?? null,
        effectiveFrom: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin/earnings POST:", e);
    return NextResponse.json(
      { error: "Failed to save earnings config" },
      { status: 500 },
    );
  }
}
