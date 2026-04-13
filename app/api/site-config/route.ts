import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const keys = searchParams.get("keys")?.split(",").filter(Boolean);

    if (key) {
      const config = await prisma.siteConfig.findUnique({ where: { key } });
      return NextResponse.json(
        { success: true, data: config?.value ?? null },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }

    if (keys?.length) {
      const configs = await prisma.siteConfig.findMany({
        where: { key: { in: keys } },
      });
      const result = Object.fromEntries(configs.map((c) => [c.key, c.value]));
      return NextResponse.json(
        { success: true, data: result },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          },
        },
      );
    }

    return NextResponse.json({ error: "key required" }, { status: 400 });
  } catch (e) {
    console.error("site-config GET:", e);
    captureApiError(e, { route: "/site-config" });
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}
