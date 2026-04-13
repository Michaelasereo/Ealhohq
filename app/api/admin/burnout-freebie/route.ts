import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { getBurnoutFreebieConfig, getFreebiesBucket } from "@/lib/burnout-freebie";
import { prisma } from "@/lib/prisma/client";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { captureApiError } from "@/lib/sentry/capture";
const PATH_KEY = "burnout_freebie_storage_path";
const FILENAME_KEY = "burnout_freebie_email_filename";

const MAX_BYTES = 12 * 1024 * 1024;

export async function GET() {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const cfg = await getBurnoutFreebieConfig();
    return NextResponse.json({
      success: true,
      data: {
        configured: Boolean(cfg.storagePath),
        emailFilename: cfg.emailFilename,
        storagePath: cfg.storagePath,
        bucket: getFreebiesBucket(),
      },
    });
  } catch (e) {
    console.error("admin burnout-freebie GET:", e);
    captureApiError(e, { route: "/admin/burnout-freebie" });
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAdminUser();
    if (gate.response) return gate.response;

    const form = await req.formData();
    const file = form.get("file");
    const emailFilenameRaw = form.get("emailFilename");
    const emailFilename =
      typeof emailFilenameRaw === "string" && emailFilenameRaw.trim()
        ? emailFilenameRaw.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120)
        : "Ealho-burnout-guide.pdf";
    const safeFilename = emailFilename.toLowerCase().endsWith(".pdf")
      ? emailFilename
      : `${emailFilename}.pdf`;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 12MB)" }, { status: 400 });
    }
    const allowedTypes = new Set(["application/pdf", "application/octet-stream", ""]);
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.toString("utf8", 0, 4) !== "%PDF") {
      return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
    }

    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Supabase service role is not configured" },
        { status: 500 },
      );
    }

    const bucket = getFreebiesBucket();
    const objectPath = "burnout/current.pdf";

    const { error: upError } = await supabase.storage.from(bucket).upload(objectPath, buf, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (upError) {
      console.error("burnout-freebie upload:", upError);
      return NextResponse.json(
        {
          error:
            upError.message ||
            "Upload failed. Create a public storage bucket named “freebies” (or set SUPABASE_FREEBIES_BUCKET) and allow service-role uploads.",
        },
        { status: 502 },
      );
    }

    await prisma.$transaction([
      prisma.siteConfig.upsert({
        where: { key: PATH_KEY },
        update: { value: objectPath },
        create: { key: PATH_KEY, value: objectPath },
      }),
      prisma.siteConfig.upsert({
        where: { key: FILENAME_KEY },
        update: { value: safeFilename },
        create: { key: FILENAME_KEY, value: safeFilename },
      }),
    ]);

    return NextResponse.json({ success: true, data: { objectPath, emailFilename: safeFilename } });
  } catch (e) {
    console.error("admin burnout-freebie POST:", e);
    captureApiError(e, { route: "/admin/burnout-freebie" });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
