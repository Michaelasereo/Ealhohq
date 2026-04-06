import { NextResponse } from "next/server";

import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";
import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { formatLongDateWAT, formatTimeAmPmWAT } from "@/lib/rebooking/format-invite";
import { runChatSlaRemindersAndEscalations } from "@/lib/chat/admin-sla-cron";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

export const runtime = "nodejs";

/** Pre-session email + WhatsApp reminders are sent by `GET /api/cron/session-reminders`. */

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();

    let rebookExpired = 0;
    const expiredRebooks = await prisma.therapyRebookingRequest.findMany({
      where: { status: "pending", expiresAt: { lt: new Date(now) } },
      include: {
        therapist: { include: { profile: true } },
        patient: true,
      },
    });

    for (const rb of expiredRebooks) {
      await prisma.therapyRebookingRequest.update({
        where: { id: rb.id },
        data: { status: "expired", respondedAt: new Date(now) },
      });
      const tPhone = normalizeNgDigits(rb.therapist.profile.phone ?? null);
      if (tPhone) {
        const dateLine = formatLongDateWAT(
          rb.suggestedDate,
          rb.suggestedTime,
        );
        const timeLine = formatTimeAmPmWAT(rb.suggestedDate, rb.suggestedTime);
        const pf = firstName(rb.patient.fullName);
        await sendWhatsAppText({
          toE164Digits: tPhone,
          body: `Your session invitation to ${pf} for ${dateLine} at ${timeLine} WAT has expired without a response. You can send a new invitation from their profile.`,
        });
      }
      rebookExpired++;
    }

    let chatSla: Awaited<
      ReturnType<typeof runChatSlaRemindersAndEscalations>
    > | null = null;
    try {
      chatSla = await runChatSlaRemindersAndEscalations();
    } catch (chatErr) {
      console.error("cron chat SLA:", chatErr);
    }

    const nowDate = new Date(now);
    const in30 = new Date(now + 30 * 24 * 60 * 60 * 1000);
    const in7 = new Date(now + 7 * 24 * 60 * 60 * 1000);

    const expiring30 = await prisma.therapySessionPackage.findMany({
      where: {
        status: "active",
        remainingSessions: { gt: 0 },
        expiresAt: { gte: nowDate, lte: in30 },
      },
      include: {
        patient: true,
        therapist: { include: { profile: true } },
      },
    });
    const expiring7 = expiring30.filter((p) => {
      if (!p.expiresAt) return false;
      return p.expiresAt.getTime() <= in7.getTime();
    });

    for (const p of expiring30) {
      const to = normalizeNgDigits(p.patient.phone ?? null);
      if (!to) continue;
      const therapistName = therapistPublicLabel(p.therapist.profile.fullName);
      const body = `Hi ${firstName(p.patient.fullName)}! Your ${p.totalSessions}-session package with ${therapistName} expires in 30 days and you have ${p.remainingSessions} sessions left.\n\nBook your remaining sessions here:\nealho.com/book`;
      await sendWhatsAppText({ toE164Digits: to, body });
    }
    for (const p of expiring7) {
      const to = normalizeNgDigits(p.patient.phone ?? null);
      if (!to) continue;
      const therapistName = therapistPublicLabel(p.therapist.profile.fullName);
      const body = `Hi ${firstName(p.patient.fullName)}! Reminder: your ${p.totalSessions}-session package with ${therapistName} expires in 7 days. You still have ${p.remainingSessions} sessions left.\n\nBook now:\nealho.com/book`;
      await sendWhatsAppText({ toE164Digits: to, body });
    }

    const expiredPackages = await prisma.therapySessionPackage.findMany({
      where: { status: "active", expiresAt: { lt: nowDate } },
      include: { patient: true, therapist: { include: { profile: true } } },
    });
    for (const p of expiredPackages) {
      await prisma.therapySessionPackage.update({
        where: { id: p.id },
        data: { status: "expired" },
      });
      const to = normalizeNgDigits(p.patient.phone ?? null);
      if (!to) continue;
      const therapistName = therapistPublicLabel(p.therapist.profile.fullName);
      const body = `Your ${p.totalSessions}-session package with ${therapistName} has expired. ${p.usedSessions} of ${p.totalSessions} sessions were used.\n\nStart a new package anytime:\nealho.com/book`;
      await sendWhatsAppText({ toE164Digits: to, body });
    }

    return NextResponse.json({
      success: true,
      rebookRequestsExpired: rebookExpired,
      packagesExpiring30d: expiring30.length,
      packagesExpiring7d: expiring7.length,
      packagesExpired: expiredPackages.length,
      chatSla,
    });
  } catch (e) {
    console.error("cron reminders:", e);
    return NextResponse.json(
      { error: "Cron failed" },
      { status: 500 },
    );
  }
}

