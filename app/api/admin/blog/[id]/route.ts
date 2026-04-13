import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const patchSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  excerpt: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const { id } = await ctx.params;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: post });
  } catch (e) {
    console.error("admin blog id GET:", e);
    captureApiError(e, { route: "/admin/blog/[id]" });
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const { id } = await ctx.params;
    const json = (await req.json()) as unknown;
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const b = parsed.data;
    const data: Prisma.BlogPostUpdateInput = {};

    if (b.title !== undefined) data.title = b.title;
    if (b.slug !== undefined) data.slug = b.slug;
    if (b.excerpt !== undefined) data.excerpt = b.excerpt;
    if (b.content !== undefined) data.content = b.content;
    if (b.coverImage !== undefined) {
      data.coverImage = b.coverImage === "" ? null : b.coverImage;
    }
    if (b.category !== undefined) data.category = b.category;
    if (b.tags !== undefined) data.tags = b.tags;
    if (b.author !== undefined) data.author = b.author;
    if (b.authorRole !== undefined) data.authorRole = b.authorRole;
    if (b.authorPhoto !== undefined) {
      data.authorPhoto = b.authorPhoto === "" ? null : b.authorPhoto;
    }
    if (b.readingTime !== undefined) data.readingTime = b.readingTime;
    if (b.featured !== undefined) data.featured = b.featured;
    if (b.metaTitle !== undefined) data.metaTitle = b.metaTitle;
    if (b.metaDesc !== undefined) data.metaDesc = b.metaDesc;
    if (b.status !== undefined) data.status = b.status;

    if (b.publishedAt !== undefined) {
      data.publishedAt = b.publishedAt ? new Date(b.publishedAt) : null;
    }

    if (b.status === "published") {
      const existing = await prisma.blogPost.findUnique({
        where: { id },
        select: { publishedAt: true },
      });
      if (existing && !existing.publishedAt && b.publishedAt === undefined) {
        data.publishedAt = new Date();
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: post });
  } catch (e) {
    console.error("admin blog PATCH:", e);
    captureApiError(e, { route: "/admin/blog/[id]" });
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const { id } = await ctx.params;
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin blog DELETE:", e);
    captureApiError(e, { route: "/admin/blog/[id]" });
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
