import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  CITY_LABELS,
  INTEREST_LABELS,
  ROLE_LABELS,
  TEAM_SIZE_LABELS,
} from "@/lib/leads/clinic-lead-labels";
import { clinicLeadSchema } from "@/lib/leads/clinic-lead-schema";
import { prisma } from "@/lib/prisma/client";
import { emailMarkLogoImg } from "@/lib/emails/partials";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";

import { captureApiError } from "@/lib/sentry/capture";
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  try {
    const json: unknown = await req.json();
    const parsed = clinicLeadSchema.safeParse(json);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          fieldErrors,
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const body = parsed.data;

    await prisma.clinicLead.create({
      data: {
        fullName: body.fullName.trim(),
        role: body.role,
        clinicName: body.clinicName.trim(),
        city: body.city,
        teamSize: body.teamSize,
        interests: body.interests,
        whatsapp: body.whatsapp.trim(),
        source: "landing_page",
      },
    });

    const roleLabel = ROLE_LABELS[body.role];
    const cityLabel = CITY_LABELS[body.city];
    const teamLabel = TEAM_SIZE_LABELS[body.teamSize];
    const interestsText = body.interests
      .map((id) => INTEREST_LABELS[id])
      .join(", ");

    const notifyTo =
      process.env.LEADS_NOTIFY_EMAIL?.trim() || "hello@ealho.com";

    const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          ${emailMarkLogoImg({ maxHeightPx: 40, align: "left" })}
          <h2 style="color: #292612; margin: 20px 0 16px;">New clinic lead</h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${[
              ["Name", body.fullName],
              ["Role", roleLabel],
              ["Clinic", body.clinicName],
              ["City", cityLabel],
              ["Team size", teamLabel],
              ["WhatsApp", body.whatsapp],
              ["Interests", interestsText],
            ]
              .map(
                ([label, value]) => `
              <tr>
                <td style="padding: 8px 0; color: #666; font-size: 13px; width: 120px;">${escapeHtml(label)}</td>
                <td style="padding: 8px 0; color: #111; font-size: 13px; font-weight: 600;">${escapeHtml(String(value))}</td>
              </tr>`,
              )
              .join("")}
          </table>
          <div style="margin-top: 20px; padding: 12px 16px; background: #f0f9f4; border-radius: 8px;">
            <p style="margin: 0; color: #292612; font-size: 13px;">
              Follow up on WhatsApp: <strong>${escapeHtml(body.whatsapp)}</strong>
            </p>
          </div>
        </div>`;

    void sendTransactionalEmail({
      to: notifyTo,
      subject: `New clinic lead: ${body.clinicName} — ${cityLabel}`,
      html,
    }).catch((e) => console.error("clinic lead email:", e));

    const first = body.fullName.split(/\s+/)[0] ?? body.fullName;
    void import("@/lib/whatsapp/client").then(({ sendWhatsApp: send }) => {
      void send({
        to: body.whatsapp,
        body: `Hi ${first}! 👋\n\nThanks for your interest in Ealho Therapy.\n\nWe've received your details for ${body.clinicName} and will reach out within 24 hours.\n\nLooking forward to working with you!\n\n— The Ealho Team`,
      }).catch(() => {});
    });

    return NextResponse.json({
      success: true,
      data: { ok: true },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    console.error("Lead capture error:", error);
    captureApiError(error, { route: "/leads/clinic" });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") {
        return NextResponse.json(
          {
            success: false,
            error:
              "Lead capture is not set up on this database yet. Run: npx prisma migrate deploy (or ask your team). You can still email hello@ealho.com.",
            code: error.code,
            meta: { timestamp: new Date().toISOString() },
          },
          { status: 503 },
        );
      }
    }

    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("clinic_leads") && msg.toLowerCase().includes("does not exist")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Lead capture is not set up on this environment yet. Please email hello@ealho.com or run: npx prisma migrate deploy",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to submit. Please try again or email hello@ealho.com.",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
