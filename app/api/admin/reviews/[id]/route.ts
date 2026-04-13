import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const patchSchema = z.object({
  action: z.enum(["approve", "republish", "feature", "unfeature", "unpublish"]),
});

type Ctx = { params: Promise<{ id: string }> };

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

    const action = parsed.data.action;

    if (action === "approve") {
      const review = await prisma.review.update({
        where: { id },
        data: {
          isApproved: true,
          isPublished: true,
        },
      });
      return NextResponse.json({ success: true, data: review });
    }

    if (action === "republish") {
      const review = await prisma.review.update({
        where: { id },
        data: {
          isApproved: true,
          isPublished: true,
        },
      });
      return NextResponse.json({ success: true, data: review });
    }

    if (action === "feature") {
      const review = await prisma.review.update({
        where: { id },
        data: { isFeatured: true },
      });
      return NextResponse.json({ success: true, data: review });
    }

    if (action === "unfeature") {
      const review = await prisma.review.update({
        where: { id },
        data: { isFeatured: false },
      });
      return NextResponse.json({ success: true, data: review });
    }

    if (action === "unpublish") {
      const review = await prisma.review.update({
        where: { id },
        data: { isPublished: false },
      });
      return NextResponse.json({ success: true, data: review });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("admin reviews PATCH:", e);
    captureApiError(e, { route: "/admin/reviews/[id]" });
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const { id } = await ctx.params;
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin reviews DELETE:", e);
    captureApiError(e, { route: "/admin/reviews/[id]" });
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
