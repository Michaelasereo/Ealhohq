import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { captureApiError } from "@/lib/sentry/capture";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "connected", latencyMs: Date.now() - start },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e) {
    captureApiError(e, { route: "/api/health" });
    const message = e instanceof Error ? e.message : "unknown";
    return NextResponse.json(
      { status: "error", db: "unreachable", error: message, latencyMs: Date.now() - start },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
