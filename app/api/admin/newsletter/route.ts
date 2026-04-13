import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Michael from Ealho <hello@ealho.com>";

const sendSchema = z.object({
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(200000),
});

async function sendInBatches(
  emails: string[],
  sender: (to: string) => Promise<void>,
): Promise<number> {
  const BATCH_SIZE = 50;
  const DELAY_MS = 1000;
  let sentCount = 0;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (email) => {
        await sender(email);
        sentCount++;
      }),
    );

    if (i + BATCH_SIZE < emails.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return sentCount;
}

export async function GET(req: Request) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = 25;

    const where = search
      ? { email: { contains: search, mode: "insensitive" as const } }
      : {};

    const [total, unsubscribedCount, rows] = await Promise.all([
      prisma.subscriber.count({ where }),
      prisma.subscriber.count({ where: { ...where, unsubscribed: true } }),
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const recentSends = await prisma.newsletterSend.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const activeCount = total - unsubscribedCount;
    const avgSequence =
      rows.length > 0
        ? rows.reduce((sum, s) => sum + s.sequence, 0) / rows.length
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        stats: { total, active: activeCount, unsubscribed: unsubscribedCount, avgSequence },
        subscribers: rows,
        sends: recentSends,
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("admin newsletter GET", error);
    captureApiError(error, { route: "/admin/newsletter" });
    return NextResponse.json({ error: "Failed to load newsletter data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const payload = (await req.json()) as unknown;
    const parsed = sendSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const subscribers = await prisma.subscriber.findMany({
      where: { unsubscribed: false },
      select: { email: true },
    });

    const sentCount = await sendInBatches(
      subscribers.map((s) => s.email),
      async (to) => {
        await resend.emails.send({
          from: FROM_EMAIL,
          to,
          subject: parsed.data.subject,
          html: parsed.data.body,
        });
      },
    );

    await prisma.newsletterSend.create({
      data: {
        subject: parsed.data.subject,
        body: parsed.data.body,
        sentCount,
        sentBy: gate.user.id,
      },
    });

    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    console.error("admin newsletter POST", error);
    captureApiError(error, { route: "/admin/newsletter" });
    return NextResponse.json({ error: "Failed to send newsletter" }, { status: 500 });
  }
}
