import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";
import { LAST_SEQUENCE_STEP } from "@/lib/email/sequences/burnout-sequence";

import { captureApiError } from "@/lib/sentry/capture";
const itemSchema = z.object({
  step: z.number().int().min(1).max(LAST_SEQUENCE_STEP),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(4000),
  ctaLabel: z.string().min(1).max(120),
});

const patchSchema = z.object({
  items: z.array(itemSchema).min(1).max(LAST_SEQUENCE_STEP),
});

function keys(step: number) {
  return {
    subject: `marketing_seq_day${step}_subject`,
    body: `marketing_seq_day${step}_body`,
    cta: `marketing_seq_day${step}_cta`,
  };
}

export async function GET() {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const wantedKeys: string[] = [];
    for (let step = 1; step <= LAST_SEQUENCE_STEP; step++) {
      const k = keys(step);
      wantedKeys.push(k.subject, k.body, k.cta);
    }
    const rows = await prisma.siteConfig.findMany({
      where: { key: { in: wantedKeys } },
      select: { key: true, value: true },
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (e) {
    console.error("admin marketing-sequence GET:", e);
    captureApiError(e, { route: "/admin/marketing-sequence" });
    return NextResponse.json({ error: "Failed to load sequence settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    for (const item of parsed.data.items) {
      const k = keys(item.step);
      await prisma.siteConfig.upsert({
        where: { key: k.subject },
        update: { value: item.subject.trim() },
        create: { key: k.subject, value: item.subject.trim() },
      });
      await prisma.siteConfig.upsert({
        where: { key: k.body },
        update: { value: item.body.trim() },
        create: { key: k.body, value: item.body.trim() },
      });
      await prisma.siteConfig.upsert({
        where: { key: k.cta },
        update: { value: item.ctaLabel.trim() },
        create: { key: k.cta, value: item.ctaLabel.trim() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin marketing-sequence PATCH:", e);
    captureApiError(e, { route: "/admin/marketing-sequence" });
    return NextResponse.json({ error: "Failed to save sequence settings" }, { status: 500 });
  }
}
