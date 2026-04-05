import { NextResponse } from "next/server";
import { z } from "zod";

import { patientHasFullChatConsent } from "@/lib/chat/consent";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const postSchema = z
  .object({
    platformProcessing: z.literal(true),
    safetyScanning: z.literal(true),
    safetyOverride: z.literal(true),
  })
  .strict();

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patient = await ensureRegisteredPatientForUser(user);
    if (!patient) {
      return NextResponse.json({ success: true, data: { hasConsent: false } });
    }
    const hasConsent = await patientHasFullChatConsent(patient.id);
    return NextResponse.json({ success: true, data: { hasConsent } });
  } catch (e) {
    console.error("chat/consent GET:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user.app_metadata?.role as string | undefined;
    if (role !== "patient") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json();
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "All consents must be accepted", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const patient = await ensureRegisteredPatientForUser(user);
    if (!patient) {
      return NextResponse.json(
        { error: "Patient profile required" },
        { status: 403 },
      );
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;
    const userAgent = req.headers.get("user-agent") ?? null;

    const rows = [
      { consentType: "platform_processing" as const, consentGiven: true },
      { consentType: "safety_scanning" as const, consentGiven: true },
      { consentType: "safety_override" as const, consentGiven: true },
    ];

    for (const r of rows) {
      await prisma.chatConsent.create({
        data: {
          patientId: patient.id,
          consentType: r.consentType,
          consentGiven: r.consentGiven,
          consentVersion: "1.0",
          ipAddress: ip,
          userAgent,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("chat/consent POST:", e);
    return NextResponse.json({ error: "Failed to save consent" }, { status: 500 });
  }
}
