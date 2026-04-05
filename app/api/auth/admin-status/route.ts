import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";

/** Lets admin login UI allow access when role is only in `shared_profiles`. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ admin: false });
  }
  return NextResponse.json({ admin: await isAdminUser(user) });
}
