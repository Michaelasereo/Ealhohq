import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation / magic-link return URL (PKCE).
 * Add this exact URL to Supabase → Authentication → URL Configuration → Redirect URLs:
 *   http://localhost:3000/auth/callback
 *   https://<your-domain>/auth/callback
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  const origin = url.origin;

  if (err) {
    const q = new URLSearchParams();
    q.set("error", errDesc ?? err);
    return NextResponse.redirect(`${origin}/login?${q.toString()}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const safeNext = next.startsWith("/") ? next : "/dashboard";
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
    console.error("auth/callback exchangeCodeForSession:", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
