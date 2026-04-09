import { prisma } from "@/lib/prisma/client";
import { emailMarkLogoImg } from "@/lib/emails/partials";
import { getBurnoutFreebieConfig, getFreebiesBucket } from "@/lib/burnout-freebie";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function getEmailSafeAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "https://ealho.com";
  const normalized = raw.replace(/\/$/, "");
  if (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes(".local")
  ) {
    return "https://ealho.com";
  }
  return normalized;
}

const APP_URL = getEmailSafeAppUrl();
const BRAND_COLOR = "#2C3B2D";

export const LAST_SEQUENCE_STEP = 5;
export const SEQUENCE_DELAYS: Record<number, number> = {
  2: 2,
  3: 4,
  4: 6,
  5: 9,
};

type StepDefaults = {
  subject: string;
  body: string;
  ctaLabel: string;
};

export const DEFAULT_SEQUENCE_TEMPLATES: Record<number, StepDefaults> = {
  1: {
    subject: "Your burnout guide is ready",
    body: [
      "Thank you for taking this step for yourself, and please know you are not alone in this season.",
      "Burnout is common among healthcare professionals in Nigeria, and small intentional support can make a meaningful difference quickly.",
      "Use the button below to download your guide, and I will share short practical notes over the next few days.",
    ].join("\n\n"),
    ctaLabel: "Download your burnout guide (PDF)",
  },
  2: {
    subject: "62% of clinicians report burnout symptoms",
    body: [
      "Recent Nigerian data shows many healthcare professionals are carrying emotional strain that does not resolve with rest alone.",
      "If this feels familiar, it is not a personal failure, it is a signal that your system needs support.",
      "Download your guide below and use one section today to reduce pressure this week.",
    ].join("\n\n"),
    ctaLabel: "Download the guide",
  },
  3: {
    subject: "You can ask for support without losing privacy",
    body: [
      "Many clinicians delay help because they fear being seen, judged, or misunderstood by people around them.",
      "Your care can stay private, structured, and designed around your real schedule.",
      "Download your guide below and start with the section on emotional fatigue checkpoints.",
    ].join("\n\n"),
    ctaLabel: "Download the guide",
  },
  4: {
    subject: "Three signs your stress may be burnout",
    body: [
      "If you feel emotionally numb, constantly exhausted, or unusually detached from patients, it may be more than routine stress.",
      "Recognizing the pattern early helps you recover faster and protect your work, relationships, and health.",
      "Download your guide below and review the self-check page in under three minutes.",
    ].join("\n\n"),
    ctaLabel: "Download the guide",
  },
  5: {
    subject: "A simple reset you can do today",
    body: [
      "You do not need a perfect week to start feeling better, you only need one intentional step today.",
      "A short check-in, better boundaries, and the right support can lower burnout load significantly over time.",
      "Download your guide below and choose one action to complete before your next shift ends.",
    ].join("\n\n"),
    ctaLabel: "Download the guide",
  },
};

function keyFor(step: number, field: "subject" | "body" | "cta"): string {
  return `marketing_seq_day${step}_${field}`;
}

type RuntimeTemplate = {
  subject: string;
  body: string;
  ctaLabel: string;
};

export async function getSequenceTemplates(): Promise<Record<number, RuntimeTemplate>> {
  const allKeys: string[] = [];
  for (let step = 1; step <= LAST_SEQUENCE_STEP; step++) {
    allKeys.push(keyFor(step, "subject"), keyFor(step, "body"), keyFor(step, "cta"));
  }

  const rows = await prisma.siteConfig.findMany({
    where: { key: { in: allKeys } },
    select: { key: true, value: true },
  });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const result: Record<number, RuntimeTemplate> = {};
  for (let step = 1; step <= LAST_SEQUENCE_STEP; step++) {
    const d = DEFAULT_SEQUENCE_TEMPLATES[step];
    result[step] = {
      subject: byKey.get(keyFor(step, "subject"))?.trim() || d.subject,
      body: byKey.get(keyFor(step, "body"))?.trim() || d.body,
      ctaLabel: byKey.get(keyFor(step, "cta"))?.trim() || d.ctaLabel,
    };
  }
  return result;
}

function toParagraphs(body: string): string[] {
  const normalized = body
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return normalized.length ? normalized : [DEFAULT_SEQUENCE_TEMPLATES[1].body];
}

function renderEmailHtml(params: {
  name: string;
  email: string;
  body: string;
  ctaLabel: string;
  downloadUrl: string;
}): string {
  const paragraphs = toParagraphs(params.body)
    .map(
      (p) =>
        `<tr><td style="padding:0 0 14px;font-size:15px;color:#333;line-height:1.7;">${p}</td></tr>`,
    )
    .join("");
  const headerLogo = emailMarkLogoImg({ maxHeightPx: 48, align: "center" });
  const unsubUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(params.email)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#F5F2EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;width:100% !important;height:auto !important;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#F5F2EC;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <!--[if mso]><table role="presentation" width="520" align="center" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width:520px;border-collapse:collapse;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 24px;">
              ${headerLogo}
            </td>
          </tr>
          <!-- Main card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:28px;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse;">
                <tr><td style="padding:0 0 14px;font-size:15px;color:#333;">Hi ${params.name},</td></tr>
                ${paragraphs}
                <tr>
                  <td align="center" style="padding:22px 0 6px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius:10px;background:${BRAND_COLOR};">
                          <a href="${params.downloadUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${params.ctaLabel}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 0 0;font-size:15px;color:#333;">
                    Michael<br/><span style="color:#888;font-size:13px;">CEO, Co-founder, Ealho</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0;font-size:11px;color:#BBB;line-height:1.8;">
              Ealho Technologies Limited &middot; Lagos, Nigeria<br/>
              <a href="${unsubUrl}" style="color:#BBB;">Unsubscribe</a>
              &nbsp;&middot;&nbsp;
              <a href="${APP_URL}/privacy" style="color:#BBB;">Privacy Policy</a>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

async function getSignedDownloadUrl(): Promise<string> {
  const fallback = `${APP_URL}/api/burnout-guide/download?download=1`;
  try {
    const { storagePath } = await getBurnoutFreebieConfig();
    if (!storagePath) return fallback;
    const supabase = createServiceRoleClient();
    const bucket = getFreebiesBucket();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS, {
        download: true,
      });
    if (error || !data?.signedUrl) return fallback;
    return data.signedUrl;
  } catch {
    return fallback;
  }
}

export async function buildEmailForStep(params: {
  step: number;
  name: string;
  email: string;
  templates?: Record<number, RuntimeTemplate>;
}): Promise<{ subject: string; html: string } | null> {
  if (params.step < 1 || params.step > LAST_SEQUENCE_STEP) return null;
  const templates = params.templates ?? (await getSequenceTemplates());
  const template = templates[params.step];
  if (!template) return null;
  const downloadUrl = await getSignedDownloadUrl();
  return {
    subject: template.subject,
    html: renderEmailHtml({
      name: params.name,
      email: params.email,
      body: template.body,
      ctaLabel: template.ctaLabel,
      downloadUrl,
    }),
  };
}

export async function generateDay1Email(firstName: string, email: string): Promise<string> {
  const built = await buildEmailForStep({ step: 1, name: firstName, email });
  return built?.html ?? "";
}
