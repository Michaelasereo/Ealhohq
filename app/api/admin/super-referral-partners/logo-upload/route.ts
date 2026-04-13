import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { captureApiError } from "@/lib/sentry/capture";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * Admin-only upload to `partner-logos` bucket. Returns public URL for `SuperReferralPartner.logoUrl`.
 */
export async function POST(req: Request) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { success: false, error: "file field required" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "Image must be 5MB or smaller" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { success: false, error: "Use JPG, PNG, or WebP" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = extFromMime(mime);
  const path = `branding/${randomUUID()}.${ext}`;

  try {
    const supabase = createServiceRoleClient();
    const { error: upErr } = await supabase.storage
      .from("partner-logos")
      .upload(path, buf, {
        contentType: mime,
        upsert: false,
      });

    if (upErr) {
      console.error("partner-logos upload:", upErr);
      return NextResponse.json(
        {
          success: false,
          error:
            "Upload failed. Create the partner-logos bucket and policies (see supabase/migrations/008_partner_logos_bucket.sql).",
        },
        { status: 503 },
      );
    }

    const { data: pub } = supabase.storage.from("partner-logos").getPublicUrl(path);

    return NextResponse.json({
      success: true,
      data: { publicUrl: pub.publicUrl, path },
    });
  } catch (e) {
    console.error("logo-upload:", e);
    captureApiError(e, { route: "/admin/super-referral-partners/logo-upload" });
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 },
    );
  }
}
