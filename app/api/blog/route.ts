import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 50);
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1);
    const search = searchParams.get("search")?.trim();

    const where: {
      status: string;
      category?: string;
      featured?: boolean;
      OR?: Array<Record<string, unknown>>;
    } = { status: "published" };
    if (category && category !== "All") where.category = category;
    if (featured === "true") where.featured = true;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          category: true,
          tags: true,
          author: true,
          authorRole: true,
          authorPhoto: true,
          readingTime: true,
          featured: true,
          publishedAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("blog GET:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
