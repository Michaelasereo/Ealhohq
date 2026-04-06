import { NextResponse } from "next/server";

import {
  canonicalEmailForGuestMatch,
  isGoogleHostedConsumerDomain,
} from "@/lib/email/gmail-canonical";
import { prisma } from "@/lib/prisma/client";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const emailRaw = searchParams.get("email")?.trim();
    if (!emailRaw?.includes("@")) {
      return NextResponse.json({ found: false });
    }
    const email = emailRaw.toLowerCase();

    let guestPatient = await prisma.therapyPatient.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        profileId: null,
      },
      include: {
        bookings: {
          where: {
            status: { in: ["confirmed", "completed"] },
          },
          orderBy: { date: "desc" },
          take: 1,
          include: {
            therapist: {
              include: { profile: { select: { fullName: true } } },
            },
          },
        },
      },
    });

    if (
      !guestPatient &&
      isGoogleHostedConsumerDomain(email)
    ) {
      const canon = canonicalEmailForGuestMatch(email);
      const candidates = await prisma.therapyPatient.findMany({
        where: {
          profileId: null,
          OR: [
            { email: { endsWith: "@gmail.com", mode: "insensitive" } },
            { email: { endsWith: "@googlemail.com", mode: "insensitive" } },
          ],
        },
        include: {
          bookings: {
            where: {
              status: { in: ["confirmed", "completed"] },
            },
            orderBy: { date: "desc" },
            take: 1,
            include: {
              therapist: {
                include: { profile: { select: { fullName: true } } },
              },
            },
          },
        },
      });
      const match = candidates.find(
        (g) => canonicalEmailForGuestMatch(g.email) === canon,
      );
      if (match) guestPatient = match;
    }

    if (!guestPatient || guestPatient.bookings.length === 0) {
      return NextResponse.json({ found: false });
    }

    const sessionCount = await prisma.therapyBooking.count({
      where: {
        patientId: guestPatient.id,
        status: { in: ["confirmed", "completed"] },
      },
    });

    const lastBooking = guestPatient.bookings[0];

    return NextResponse.json({
      found: true,
      sessionCount,
      therapistName: therapistPublicLabel(
        lastBooking.therapist.profile.fullName,
      ),
      lastSessionDate: lastBooking.date.toISOString(),
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}
