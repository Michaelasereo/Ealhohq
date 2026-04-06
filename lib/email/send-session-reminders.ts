import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { sessionJoinUrl } from "@/lib/reminders/format-session-link";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { getDisplayName } from "@/lib/utils/patient-display";
import { bookingDateStartToIso } from "@/lib/wat-datetime";
import { prisma } from "@/lib/prisma/client";
import { sendWhatsApp } from "@/lib/whatsapp/client";

import { sessionReminder24h } from "./templates/session-reminder-24h";
import { sessionReminder6h } from "./templates/session-reminder-6h";

const H = 60 * 60 * 1000;
const WIN = 15 * 60 * 1000;

function inWindow(deltaMs: number, targetMs: number): boolean {
  return Math.abs(deltaMs - targetMs) < WIN;
}

function formatDateLabel(booking: { date: Date; startTime: string }): string {
  const iso = bookingDateStartToIso(booking.date, booking.startTime);
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function formatTime12hWat(booking: { date: Date; startTime: string }): string {
  const iso = bookingDateStartToIso(booking.date, booking.startTime);
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export async function sendSessionReminders() {
  const now = Date.now();
  const from = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const to = new Date(now + 3 * 24 * 60 * 60 * 1000);

  const baseInclude = {
    therapist: { include: { profile: true } },
    patient: true,
  } as const;

  const need24hReminder = await prisma.therapyBooking.findMany({
    where: {
      status: "confirmed",
      reminder24hSent: false,
      date: { gte: from, lte: to },
    },
    include: baseInclude,
  });

  const need6hReminder = await prisma.therapyBooking.findMany({
    where: {
      status: "confirmed",
      reminder1hSent: false,
      date: { gte: from, lte: to },
    },
    include: baseInclude,
  });

  let sent24 = 0;
  let sent6 = 0;

  for (const booking of need24hReminder) {
    const startMs = new Date(
      bookingDateStartToIso(booking.date, booking.startTime),
    ).getTime();
    const delta = startMs - now;
    if (!inWindow(delta, 24 * H)) continue;

    try {
      const email = booking.guestEmail ?? booking.patient?.email ?? null;
      const clientName = getDisplayName({
        isAnonymous: booking.isAnonymous,
        clientAlias: booking.clientAlias,
        guestName: booking.guestName,
        patient: booking.patient ? { fullName: booking.patient.fullName } : null,
      });
      const phone = booking.guestPhone ?? booking.patient?.phone ?? null;

      if (!email) continue;

      const sessionLink = sessionJoinUrl(booking.id);
      const dateLabel = formatDateLabel(booking);
      const timeLabel = formatTime12hWat(booking);

      let isFirstSession = true;
      if (booking.patientId) {
        const priorCompleted = await prisma.therapySession.count({
          where: {
            patientId: booking.patientId,
            status: "completed",
          },
        });
        isFirstSession = priorCompleted === 0;
      }

      const template = sessionReminder24h({
        clientName,
        therapistName: therapistPublicLabel(booking.therapist.profile.fullName),
        date: dateLabel,
        time: timeLabel,
        duration: booking.therapist.sessionDuration,
        sessionLink,
        isAnonymous: booking.isAnonymous,
        isFirstSession,
      });

      await sendTransactionalEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });

      if (phone?.trim()) {
        await sendWhatsApp({
          to: phone,
          body: `Hi ${booking.isAnonymous ? "there" : clientName.split(" ")[0]}! 👋

Reminder: Your therapy session is tomorrow.

👨‍⚕️ ${therapistPublicLabel(booking.therapist.profile.fullName)}
📅 ${dateLabel}
🕐 ${timeLabel} WAT

Join here: ${sessionLink}

⚠️ Sessions happen on Ealho only. Never move to another platform or share your login details.`,
        }).catch(() => {});
      }

      await prisma.therapyBooking.update({
        where: { id: booking.id },
        data: { reminder24hSent: true },
      });
      sent24++;
    } catch (err) {
      console.error(`24h reminder failed for ${booking.id}:`, err);
    }
  }

  for (const booking of need6hReminder) {
    const startMs = new Date(
      bookingDateStartToIso(booking.date, booking.startTime),
    ).getTime();
    const delta = startMs - now;
    if (!inWindow(delta, 6 * H)) continue;

    try {
      const email = booking.guestEmail ?? booking.patient?.email ?? null;
      const clientName = getDisplayName({
        isAnonymous: booking.isAnonymous,
        clientAlias: booking.clientAlias,
        guestName: booking.guestName,
        patient: booking.patient ? { fullName: booking.patient.fullName } : null,
      });
      const phone = booking.guestPhone ?? booking.patient?.phone ?? null;

      if (!email) continue;

      const sessionLink = sessionJoinUrl(booking.id);
      const timeLabel = formatTime12hWat(booking);

      const template = sessionReminder6h({
        clientName,
        therapistName: therapistPublicLabel(booking.therapist.profile.fullName),
        time: timeLabel,
        sessionLink,
        isAnonymous: booking.isAnonymous,
      });

      await sendTransactionalEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });

      if (phone?.trim()) {
        await sendWhatsApp({
          to: phone,
          body: `Hi! ⏰ Your session is in 6 hours.

🕐 Today at ${timeLabel} WAT
👨‍⚕️ ${therapistPublicLabel(booking.therapist.profile.fullName)}

Join here: ${sessionLink}

Make sure you're in a quiet, private space.`,
        }).catch(() => {});
      }

      await prisma.therapyBooking.update({
        where: { id: booking.id },
        data: { reminder1hSent: true },
      });
      sent6++;
    } catch (err) {
      console.error(`6h reminder failed for ${booking.id}:`, err);
    }
  }

  return { sent24h: sent24, sent6h: sent6 };
}
