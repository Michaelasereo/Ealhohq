import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

const actionSchema = z.object({
  action: z.enum(["advance", "reset", "remove"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const { id } = await ctx.params;
    const payload = actionSchema.safeParse(await req.json());
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const action = payload.data.action;

    if (action === "advance") {
      const updated = await prisma.subscriber.update({
        where: { id },
        data: { sequence: { increment: 1 }, lastEmailAt: new Date() },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "reset") {
      const updated = await prisma.subscriber.update({
        where: { id },
        data: {
          sequence: 1,
          lastEmailAt: null,
          unsubscribed: false,
          unsubscribedAt: null,
        },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    await prisma.subscriber.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("admin newsletter subscriber PATCH", error);
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }
}
