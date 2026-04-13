import { NextResponse } from "next/server";
import { z } from "zod";

import { getBurnoutFreebieConfig, getFreebiesBucket } from "@/lib/burnout-freebie";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendBurnoutGuideEmail } from "@/lib/reminders/send-email";

import { captureApiError } from "@/lib/sentry/capture";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().max(200).trim().optional(),
  email: z.string().email().max(320).trim().toLowerCase(),
  stayAnonymous: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const json = (await req.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const stayAnonymous = parsed.data.stayAnonymous === true;
    const nameTrim = parsed.data.name?.trim() ?? "";
    if (!stayAnonymous && !nameTrim) {
      return NextResponse.json({ error: "Name is required unless you stay anonymous" }, { status: 400 });
    }

    const { storagePath, emailFilename } = await getBurnoutFreebieConfig();
    if (!storagePath) {
      return NextResponse.json(
        { error: "This guide is not available yet. Please try again later." },
        { status: 503 },
      );
    }

    let supabase;
    try {
      supabase = createServiceRoleClient();
    } catch {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const bucket = getFreebiesBucket();
    const { data: blob, error: dlError } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (dlError || !blob) {
      console.error("burnout-guide download:", dlError);
      return NextResponse.json(
        { error: "Could not load the guide file. Please contact support." },
        { status: 503 },
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    const content = Buffer.from(arrayBuffer);
    if (content.length < 8 || content.toString("utf8", 0, 4) !== "%PDF") {
      console.error("burnout-guide: stored file is not a valid PDF");
      return NextResponse.json({ error: "Invalid guide file" }, { status: 503 });
    }

    const firstName = stayAnonymous ? "there" : (nameTrim.split(/\s+/)[0] ?? nameTrim);
    const sent = await sendBurnoutGuideEmail({
      to: parsed.data.email,
      firstName,
      attachment: { filename: emailFilename, content },
    });

    if (!sent.success) {
      return NextResponse.json(
        { error: "Could not send email. Please try again in a few minutes." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("burnout-guide request:", e);
    captureApiError(e, { route: "/burnout-guide/request" });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
