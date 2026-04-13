import { NextResponse } from "next/server";

import { finalizeCreditPurchase } from "@/lib/payment/finalize-credit-purchase";
import { getPaystackSecretKey } from "@/lib/paystack/server-keys";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";

import { captureApiError } from "@/lib/sentry/capture";
function parseMetadata(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return typeof p === "object" && p !== null && !Array.isArray(p)
        ? Object.fromEntries(
            Object.entries(p as Record<string, unknown>).map(([k, v]) => [
              k,
              String(v),
            ]),
          )
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
        k,
        String(v),
      ]),
    );
  }
  return {};
}

export async function POST(req: Request) {
  try {
    const secret = (await getPaystackSecretKey()).trim();
    if (!secret) {
      return NextResponse.json(
        { success: false, error: "Paystack is not configured" },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
    if (!patient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { reference } = (await req.json()) as { reference?: string };
    if (typeof reference !== "string" || !reference.trim()) {
      return NextResponse.json(
        { success: false, error: "reference required" },
        { status: 400 },
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference.trim())}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
      },
    );

    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        metadata?: unknown;
        amount?: number;
      };
    };

    if (!payload.status || payload.data?.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: payload.message ?? "Verification failed",
        },
        { status: 400 },
      );
    }

    const meta = parseMetadata(payload.data?.metadata);
    if (meta.type !== "credit_purchase" || meta.patient_id !== patient.id) {
      return NextResponse.json(
        { success: false, error: "Payment does not match this account" },
        { status: 400 },
      );
    }

    const credits = Number(meta.credits);
    if (!Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid credits metadata" },
        { status: 400 },
      );
    }

    const pkg = meta.package ?? "bronze";

    await finalizeCreditPurchase({
      patientId: patient.id,
      credits,
      paystackReference: reference.trim(),
      packageKey: pkg,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("credits/verify:", e);
    captureApiError(e, { route: "/credits/verify" });
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 },
    );
  }
}
