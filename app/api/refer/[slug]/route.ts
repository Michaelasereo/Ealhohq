import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    if (!slug?.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid link" },
        { status: 400 },
      );
    }
    const body = (await req.json().catch(() => ({}))) as {
      patientName?: string;
      patientEmail?: string;
      patientPhone?: string;
      note?: string;
    };
    const email =
      typeof body.patientEmail === "string" ? body.patientEmail.trim() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid client email is required" },
        { status: 400 },
      );
    }
    // Partner referrals can be wired to CRM or email later; acknowledge for UX.
    return NextResponse.json({
      success: true,
      data: { slug: slug.trim(), receivedAt: new Date().toISOString() },
    });
  } catch (e) {
    console.error("refer POST:", e);
    return NextResponse.json(
      { success: false, error: "Could not submit referral" },
      { status: 500 },
    );
  }
}
