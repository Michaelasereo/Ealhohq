import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma/client";

const bodySchema = z.object({
  helpful: z.boolean(),
});

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const json = (await req.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const post = await prisma.blogPost.findFirst({
      where: { slug, status: "published" },
      select: { id: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.blogPostFeedback.create({
      data: {
        postId: post.id,
        helpful: parsed.data.helpful,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("blog feedback POST:", e);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
