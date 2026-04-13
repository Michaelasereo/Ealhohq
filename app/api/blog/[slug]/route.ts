import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: "published" },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: post });
  } catch (e) {
    console.error("blog slug GET:", e);
    captureApiError(e, { route: "/blog/[slug]" });
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}
