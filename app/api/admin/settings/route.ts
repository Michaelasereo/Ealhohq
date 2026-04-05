import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const DEFAULT_ID = "default";

export type AdminSettingsPayload = {
  platformName: string;
  supportEmail: string;
  defaultSessionRateNgn: number;
  defaultSessionDuration: number;
  bookingWindowWeeks: number;
  minimumNoticeHours: number;
  paystackPublicKeyMasked: string;
  paystackSecretKeyMasked: string;
};

function maskKey(key: string, visible = 6): string {
  if (!key || key.length <= visible) return "••••••";
  return `${key.slice(0, visible)}${"•".repeat(12)}`;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const row = await prisma.adminAppSettings.findUnique({
      where: { id: DEFAULT_ID },
    });
    const stored = (row?.payload ?? {}) as Record<string, unknown>;

    const envPk = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim() ?? "";
    const envSk = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
    const storedPk =
      typeof stored.paystackPublicKey === "string"
        ? stored.paystackPublicKey.trim()
        : "";
    const storedSk =
      typeof stored.paystackSecretKey === "string"
        ? stored.paystackSecretKey.trim()
        : "";

    const effectivePk = storedPk || envPk;
    const effectiveSk = storedSk || envSk;

    const merged: AdminSettingsPayload = {
      platformName: String(stored.platformName ?? "Ealho Therapy"),
      supportEmail: String(stored.supportEmail ?? "hello@ealhohq.com"),
      defaultSessionRateNgn: Number(stored.defaultSessionRateNgn ?? 15000),
      defaultSessionDuration: Number(stored.defaultSessionDuration ?? 50),
      bookingWindowWeeks: Number(stored.bookingWindowWeeks ?? 4),
      minimumNoticeHours: Number(stored.minimumNoticeHours ?? 2),
      paystackPublicKeyMasked: maskKey(effectivePk),
      paystackSecretKeyMasked: maskKey(effectiveSk),
    };

    return NextResponse.json({
      success: true,
      data: {
        settings: merged,
        adminName: user.user_metadata?.full_name ?? user.email ?? "",
        adminEmail: user.email ?? "",
        paystackSource: {
          publicFromDb: Boolean(storedPk),
          secretFromDb: Boolean(storedSk),
        },
      },
    });
  } catch (e) {
    console.error("admin settings GET:", e);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<AdminSettingsPayload> & {
      adminName?: string;
      paystackPublicKey?: string;
      paystackSecretKey?: string;
      clearPaystackKeys?: boolean;
    };

    const row = await prisma.adminAppSettings.findUnique({
      where: { id: DEFAULT_ID },
    });
    const prev = (row?.payload ?? {}) as Record<string, unknown>;

    const nextPayload: Record<string, unknown> = { ...prev };

    if (body.clearPaystackKeys === true) {
      delete nextPayload.paystackPublicKey;
      delete nextPayload.paystackSecretKey;
    }

    if (
      typeof body.paystackPublicKey === "string" &&
      body.paystackPublicKey.trim()
    ) {
      nextPayload.paystackPublicKey = body.paystackPublicKey.trim();
    }
    if (
      typeof body.paystackSecretKey === "string" &&
      body.paystackSecretKey.trim()
    ) {
      nextPayload.paystackSecretKey = body.paystackSecretKey.trim();
    }

    if (typeof body.platformName === "string") {
      nextPayload.platformName = body.platformName;
    }
    if (typeof body.supportEmail === "string") {
      nextPayload.supportEmail = body.supportEmail;
    }
    if (typeof body.defaultSessionRateNgn === "number") {
      nextPayload.defaultSessionRateNgn = body.defaultSessionRateNgn;
    }
    if (typeof body.defaultSessionDuration === "number") {
      nextPayload.defaultSessionDuration = body.defaultSessionDuration;
    }
    if (typeof body.bookingWindowWeeks === "number") {
      nextPayload.bookingWindowWeeks = body.bookingWindowWeeks;
    }
    if (typeof body.minimumNoticeHours === "number") {
      nextPayload.minimumNoticeHours = body.minimumNoticeHours;
    }

    const payloadJson = nextPayload as Prisma.InputJsonValue;

    await prisma.adminAppSettings.upsert({
      where: { id: DEFAULT_ID },
      create: { id: DEFAULT_ID, payload: payloadJson },
      update: { payload: payloadJson },
    });

    if (typeof body.adminName === "string" && body.adminName.trim()) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const { createClient: createAdmin } = await import(
          "@supabase/supabase-js"
        );
        const adminSb = createAdmin(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await adminSb.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...(user.user_metadata as object),
            full_name: body.adminName.trim(),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin settings POST:", e);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
