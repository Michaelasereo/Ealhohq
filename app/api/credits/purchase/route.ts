import { NextResponse } from "next/server";

import {
  CREDIT_PACKAGE_PAYSTACK,
  type CreditPackageKey,
} from "@/lib/credits/purchase-config";
import { generateReference } from "@/lib/paystack/client";
import { getPaystackSecretKey } from "@/lib/paystack/server-keys";
import { getPatientByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

function appUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return u && u.length > 0 ? u.replace(/\/$/, "") : null;
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

    const base = appUrl();
    if (!base) {
      return NextResponse.json(
        { success: false, error: "NEXT_PUBLIC_APP_URL is not set" },
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

    const patient = await getPatientByProfileId(user.id);
    if (!patient) {
      return NextResponse.json(
        { error: "Patient profile required" },
        { status: 403 },
      );
    }

    const body = (await req.json()) as { package?: string };
    const pkg = (body.package ?? "").toLowerCase() as CreditPackageKey;
    if (!CREDIT_PACKAGE_PAYSTACK[pkg]) {
      return NextResponse.json(
        { success: false, error: "Invalid package" },
        { status: 400 },
      );
    }

    const { credits, amountKobo } = CREDIT_PACKAGE_PAYSTACK[pkg];
    const reference = generateReference();
    const email = patient.email.trim();
    const callback_url = `${base}/dashboard?credit_ok=1`;

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          reference,
          callback_url,
          metadata: {
            product: "therapy",
            type: "credit_purchase",
            package: pkg,
            patient_id: patient.id,
            credits: String(credits),
          },
        }),
      },
    );

    const data = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
      };
    };

    if (!data.status || !data.data?.authorization_url) {
      return NextResponse.json(
        {
          success: false,
          error: data.message ?? "Paystack initialize failed",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reference,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
      },
    });
  } catch (e) {
    console.error("credits/purchase:", e);
    return NextResponse.json(
      { success: false, error: "Purchase failed" },
      { status: 500 },
    );
  }
}
