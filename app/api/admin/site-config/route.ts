import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
const patchSchema = z.union([
  z.object({
    key: z.string().min(1),
    value: z.string(),
  }),
  z.object({
    configs: z.array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      }),
    ),
  }),
]);

export async function PATCH(req: Request) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const json = (await req.json()) as unknown;
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    if ("configs" in parsed.data) {
      for (const { key, value } of parsed.data.configs) {
        await prisma.siteConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    } else {
      await prisma.siteConfig.upsert({
        where: { key: parsed.data.key },
        update: { value: parsed.data.value },
        create: { key: parsed.data.key, value: parsed.data.value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin site-config PATCH:", e);
    captureApiError(e, { route: "/admin/site-config" });
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
