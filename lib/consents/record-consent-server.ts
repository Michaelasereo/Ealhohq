import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

export async function recordConsentRecords(input: {
  userId?: string | null;
  bookingId?: string | null;
  consentTypes: string[];
  req: Request;
  version?: string;
}): Promise<void> {
  const { userId, bookingId, consentTypes, req, version = "1.0" } = input;
  if (consentTypes.length === 0) return;

  const ip = clientIp(req);
  const ua = req.headers.get("user-agent") ?? "unknown";

  const data: Prisma.ConsentRecordCreateManyInput[] = consentTypes.map(
    (consentType) => ({
      id: randomUUID(),
      userId: userId ?? null,
      bookingId: bookingId ?? null,
      consentType,
      ipAddress: ip,
      userAgent: ua,
      version,
    }),
  );

  await prisma.consentRecord.createMany({ data });
}
