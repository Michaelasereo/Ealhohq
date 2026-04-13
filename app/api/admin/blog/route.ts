import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  coverImage: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  authorRole: z.string().optional(),
  authorPhoto: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  readingTime: z.number().int().min(1).optional(),
  featured: z.boolean().optional(),
  status: z.enum(["draft", "published"]).optional(),
  metaTitle: z.string().optional().nullable(),
  metaDesc: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const posts = await prisma.blogPost.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: posts });
  } catch (e) {
    console.error("admin blog GET:", e);
    captureApiError(e, { route: "/admin/blog" });
    return NextResponse.json({ error: "Failed to list posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const json = (await req.json()) as unknown;
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const data = parsed.data;
    const status = data.status ?? "draft";
    const publishedAt =
      status === "published"
        ? (data.publishedAt ? new Date(data.publishedAt) : new Date())
        : data.publishedAt
          ? new Date(data.publishedAt)
          : null;

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImage:
          data.coverImage === "" || data.coverImage === null
            ? undefined
            : data.coverImage,
        category: data.category ?? "Mental Health",
        tags: data.tags ?? [],
        author: data.author ?? "Ealho Team",
        authorRole: data.authorRole ?? "Editorial Team",
        authorPhoto:
          data.authorPhoto === "" || data.authorPhoto === null
            ? undefined
            : data.authorPhoto,
        readingTime: data.readingTime ?? 5,
        featured: data.featured ?? false,
        status,
        metaTitle: data.metaTitle ?? undefined,
        metaDesc: data.metaDesc ?? undefined,
        publishedAt,
      },
    });

    return NextResponse.json({ success: true, data: post });
  } catch (e) {
    console.error("admin blog POST:", e);
    captureApiError(e, { route: "/admin/blog" });
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
