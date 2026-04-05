import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { getPaystackSecretKey } from "@/lib/paystack/server-keys";

/**
 * Verifies Paystack secret key by calling a lightweight authenticated endpoint.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = (await getPaystackSecretKey()).trim();
    if (!secret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No Paystack secret key (set in Admin settings or PAYSTACK_SECRET_KEY)",
        },
        { status: 400 },
      );
    }

    const res = await fetch("https://api.paystack.co/bank?currency=NGN", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const json = (await res.json()) as { status?: boolean; message?: string };

    if (!res.ok || !json.status) {
      return NextResponse.json(
        {
          success: false,
          error: json.message ?? "Paystack rejected the secret key",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: { ok: true } });
  } catch (e) {
    console.error("paystack test:", e);
    return NextResponse.json(
      { success: false, error: "Connection failed" },
      { status: 500 },
    );
  }
}
