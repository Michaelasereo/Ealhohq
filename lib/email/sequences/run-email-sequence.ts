import { Resend } from "resend";

import { prisma } from "@/lib/prisma/client";

import {
  buildEmailForStep,
  getSequenceTemplates,
  LAST_SEQUENCE_STEP,
  SEQUENCE_DELAYS,
} from "./burnout-sequence";
const FROM_EMAIL = "Michael from Ealho <hello@ealho.com>";

export type SequenceRunResult = {
  sentCount: number;
  errorCount: number;
  processedAt: string;
};

export async function runEmailSequence(now = new Date()): Promise<SequenceRunResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY missing");
  }
  const resend = new Resend(key);

  const subscribers = await prisma.subscriber.findMany({
    where: {
      unsubscribed: false,
      sequence: { lt: LAST_SEQUENCE_STEP },
    },
  });
  const templates = await getSequenceTemplates();

  let sentCount = 0;
  let errorCount = 0;

  for (const sub of subscribers) {
    try {
      const nextSequence = sub.sequence + 1;
      const delayDays = SEQUENCE_DELAYS[nextSequence];
      if (!delayDays) continue;

      const signupDate = new Date(sub.createdAt);
      const daysSinceSignup = Math.floor(
        (now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceSignup < delayDays) continue;

      if (sub.lastEmailAt) {
        const daysSinceLast = Math.floor(
          (now.getTime() - sub.lastEmailAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceLast < 1) continue;
      }

      const firstName = sub.isAnonymous ? "there" : (sub.name?.split(" ")[0] ?? "there");
      const built = await buildEmailForStep({
        step: nextSequence,
        name: firstName,
        email: sub.email,
        templates,
      });
      if (!built) continue;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: sub.email,
        subject: built.subject,
        html: built.html,
      });

      await prisma.subscriber.update({
        where: { id: sub.id },
        data: {
          sequence: nextSequence,
          lastEmailAt: now,
        },
      });

      sentCount++;
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Sequence email failed for ${sub.email}:`, error);
      errorCount++;
    }
  }

  return { sentCount, errorCount, processedAt: now.toISOString() };
}
