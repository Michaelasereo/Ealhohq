import { NextResponse } from "next/server";

import { buildBookingEmailLayoutParams } from "@/lib/emails/build-booking-email-params";
import { sessionJoinUrl } from "@/lib/reminders/format-session-link";
import {
  sendSessionReminder1hEmail,
  sendSessionReminder24hEmail,
} from "@/lib/reminders/send-email";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";
import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { formatLongDateWAT, formatTimeAmPmWAT } from "@/lib/rebooking/format-invite";
import { runChatSlaRemindersAndEscalations } from "@/lib/chat/admin-sla-cron";
import { prisma } from "@/lib/prisma/client";
import { getDisplayName } from "@/lib/utils/patient-display";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";

export const runtime = "nodejs";

const H = 60 * 60 * 1000;
const WIN = 15 * 60 * 1000;

function inWindow(deltaMs: number, targetMs: number): boolean {
  return Math.abs(deltaMs - targetMs) < WIN;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = Date.now();
    const from = new Date(now - 2 * 24 * 60 * 60 * 1000);
    const to = new Date(now + 3 * 24 * 60 * 60 * 1000);

    const bookings = await prisma.therapyBooking.findMany({
      where: {
        status: "confirmed",
        date: { gte: from, lte: to },
        OR: [{ reminder24hSent: false }, { reminder1hSent: false }],
      },
      include: {
        therapist: { include: { profile: true } },
        patient: true,
      },
    });

    let sent24 = 0;
    let sent1 = 0;

    for (const b of bookings) {
      const startMs = new Date(
        bookingDateStartToIso(b.date, b.startTime),
      ).getTime();
      const delta = startMs - now;

      const name =
        getDisplayName({
          isAnonymous: b.isAnonymous,
          clientAlias: b.clientAlias,
          guestName: b.guestName,
          patient: b.patient ? { fullName: b.patient.fullName } : null,
        }).trim() || "there";
      const email = b.guestEmail ?? b.patient?.email ?? null;
      const phoneRaw = normalizeNgDigits(
        b.guestPhone ?? b.patient?.phone ?? null,
      );

      const therapistName = b.therapist.profile.fullName;
      const timeWat = formatWAT(bookingDateStartToIso(b.date, b.startTime));
      const dateLine = new Intl.DateTimeFormat("en-NG", {
        dateStyle: "full",
        timeZone: "Africa/Lagos",
      }).format(new Date(bookingDateStartToIso(b.date, b.startTime)));
      const link = sessionJoinUrl(b.id);
      const emailLayout = buildBookingEmailLayoutParams(b);

      if (!b.reminder24hSent && inWindow(delta, 24 * H)) {
        const wa = `Hi ${name}! 👋

Reminder: You have a therapy session tomorrow.

🗓 Date: ${dateLine}
🕐 Time: ${timeWat} WAT
👨‍⚕️ Therapist: ${therapistName}

Join here: ${link}

Reply HELP if you need to reschedule.`;

        if (phoneRaw && phoneRaw.length >= 10) {
          await sendWhatsAppText({ toE164Digits: phoneRaw, body: wa });
        }
        if (email) {
          const sent = await sendSessionReminder24hEmail(email, emailLayout);
          if (!sent.success) {
            console.error("24h reminder email:", sent.error);
          }
        }

        await prisma.therapyBooking.update({
          where: { id: b.id },
          data: { reminder24hSent: true },
        });
        sent24++;
      }

      if (!b.reminder1hSent && inWindow(delta, 1 * H)) {
        const wa = `Hi ${name}! Your session starts in 1 hour.

👨‍⚕️ Therapist: ${therapistName}
🕐 Time: ${timeWat} WAT

Join here: ${link}

See you soon! 💙`;

        if (phoneRaw && phoneRaw.length >= 10) {
          await sendWhatsAppText({ toE164Digits: phoneRaw, body: wa });
        }
        if (email) {
          const sent = await sendSessionReminder1hEmail(email, emailLayout);
          if (!sent.success) {
            console.error("1h reminder email:", sent.error);
          }
        }

        await prisma.therapyBooking.update({
          where: { id: b.id },
          data: { reminder1hSent: true },
        });
        sent1++;
      }
    }

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

    return NextResponse.json({
      success: true,
      processed: bookings.length,
      sent24h: sent24,
      sent1h: sent1,
      rebookRequestsExpired: rebookExpired,
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

