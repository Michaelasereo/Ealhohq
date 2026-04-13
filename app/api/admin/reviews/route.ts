import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const manualSchema = z.object({
  authorName: z.string().min(1).max(200),
  authorRole: z.string().min(1).max(200),
  authorLocation: z.string().min(1).max(200),
  content: z.string().min(10).max(5000),
  rating: z.number().int().min(1).max(5),
});

export async function GET(req: Request) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") ?? "pending";

    const where =
      tab === "published"
        ? { isPublished: true }
        : { isPublished: false };

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: reviews });
  } catch (e) {
    console.error("admin reviews GET:", e);
    captureApiError(e, { route: "/admin/reviews" });
    return NextResponse.json({ error: "Failed to list reviews" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const json = (await req.json()) as unknown;
    const parsed = manualSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        authorName: parsed.data.authorName,
        authorRole: parsed.data.authorRole,
        authorLocation: parsed.data.authorLocation,
        content: parsed.data.content,
        rating: parsed.data.rating,
        isAnonymous: true,
        isApproved: true,
        isPublished: true,
        isFeatured: false,
        source: "manual",
      },
    });

    return NextResponse.json({ success: true, data: review });
  } catch (e) {
    console.error("admin reviews POST:", e);
    captureApiError(e, { route: "/admin/reviews" });
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
