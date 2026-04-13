import { NextResponse } from "next/server";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma/client";
import { buildEmailForStep } from "@/lib/email/sequences/burnout-sequence";

import { captureApiError } from "@/lib/sentry/capture";
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Michael from Ealho <hello@ealho.com>";

export async function POST(req: Request) {
  try {
    const { name, email, isAnonymous, source } = (await req.json()) as {
      name?: string;
      email?: string;
      isAnonymous?: boolean;
      source?: string;
    };

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const anonymous = Boolean(isAnonymous);
    const normalizedName = anonymous ? null : (name?.trim() || null);

    const existing = await prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing && !existing.unsubscribed) {
      return NextResponse.json(
        { error: "Already subscribed", alreadySubscribed: true },
        { status: 409 },
      );
    }

    if (existing && existing.unsubscribed) {
      await prisma.subscriber.update({
        where: { id: existing.id },
        data: {
          unsubscribed: false,
          unsubscribedAt: null,
          sequence: 1,
          lastEmailAt: null,
          name: normalizedName,
          isAnonymous: anonymous,
          source: source ?? "burnout_assessment",
        },
      });
    } else {
      await prisma.subscriber.create({
        data: {
          email: normalizedEmail,
          name: normalizedName,
          isAnonymous: anonymous,
          sequence: 1,
          source: source ?? "burnout_assessment",
        },
      });
    }

    const firstName = anonymous ? "there" : (normalizedName?.split(" ")[0] ?? "there");

    const day1 = await buildEmailForStep({
      step: 1,
      name: firstName,
      email: normalizedEmail,
    });
    if (!day1) {
      return NextResponse.json({ error: "Email template unavailable" }, { status: 500 });
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: day1.subject,
      html: day1.html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    captureApiError(error, { route: "/subscribe" });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
