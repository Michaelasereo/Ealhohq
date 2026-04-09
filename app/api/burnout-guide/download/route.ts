import { NextResponse } from "next/server";

import { getBurnoutFreebieConfig, getFreebiesBucket } from "@/lib/burnout-freebie";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { storagePath, emailFilename } = await getBurnoutFreebieConfig();
    if (!storagePath) {
      return NextResponse.json({ error: "Guide not available" }, { status: 404 });
    }

    const supabase = createServiceRoleClient();
    const bucket = getFreebiesBucket();
    const { data, error } = await supabase.storage.from(bucket).download(storagePath);
    if (error || !data) {
      console.error("burnout-guide download route:", error);
      return NextResponse.json({ error: "Unable to load guide" }, { status: 503 });
    }

    const buf = Buffer.from(await data.arrayBuffer());
    if (buf.length < 4 || buf.toString("utf8", 0, 4) !== "%PDF") {
      return NextResponse.json({ error: "Invalid guide file" }, { status: 503 });
    }

    const filename = emailFilename.toLowerCase().endsWith(".pdf")
      ? emailFilename
      : `${emailFilename}.pdf`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("burnout-guide download route error:", e);
    return NextResponse.json({ error: "Failed to download guide" }, { status: 500 });
  }
}
