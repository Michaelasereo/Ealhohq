import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma/client";

const postSchema = z.object({
  authorName: z.string().min(1).max(200),
  authorRole: z.string().max(200).optional().nullable(),
  authorLocation: z.string().max(200).optional().nullable(),
  content: z.string().min(10).max(5000),
  rating: z.number().int().min(1).max(5),
  isAnonymous: z.boolean().optional(),
  source: z.enum(["platform", "google", "manual"]).optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const featured = searchParams.get("featured") === "true";
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "10", 10) || 10,
      50,
    );

    const where = {
      isPublished: true,
      isApproved: true,
      ...(featured ? { isFeatured: true } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          content: true,
          rating: true,
          authorRole: true,
          authorLocation: true,
        },
      }),
      prisma.review.count({ where }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      content: r.content,
      rating: r.rating,
      authorRole: r.authorRole,
      authorLocation: r.authorLocation,
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: { total },
    });
  } catch (e) {
    console.error("reviews GET:", e);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const json = (await req.json()) as unknown;
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid review" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        authorName: parsed.data.authorName,
        authorRole: parsed.data.authorRole ?? undefined,
        authorLocation: parsed.data.authorLocation ?? undefined,
        content: parsed.data.content,
        rating: parsed.data.rating,
        isAnonymous: parsed.data.isAnonymous ?? true,
        isApproved: false,
        isPublished: false,
        isFeatured: false,
        source: parsed.data.source ?? "platform",
      },
    });

    return NextResponse.json({ success: true, data: review.id });
  } catch (e) {
    console.error("reviews POST:", e);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
