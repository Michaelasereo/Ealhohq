import { NextResponse } from "next/server";

import { getAvailableSlots } from "@/lib/availability/slots";
import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import {
  canonicalEmailForGuestMatch,
  isGoogleHostedConsumerDomain,
} from "@/lib/email/gmail-canonical";
import { getPackageOption } from "@/lib/packages/config";
import { watDayStart } from "@/lib/wat-datetime";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      therapistId,
      date,
      startTime,
      guestName,
      guestEmail,
      guestPhone,
      sessionType,
      consentConfirmed,
      consentTimestamp,
      patientId: bodyPatientId,
      guestBookingReason,
      professionalType: rawProfessionalType,
      isAnonymous: rawAnonymous,
      referralCode: rawReferralCode,
      packageType: rawPackageType,
    } = body as Record<string, unknown>;
    const packageType =
      typeof rawPackageType === "string" ? getPackageOption(rawPackageType).id : "single";


    const isAnonymous = Boolean(rawAnonymous);

    if (
      typeof therapistId !== "string" ||
      typeof date !== "string" ||
      typeof startTime !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "therapistId, date, and startTime are required",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    if (!DATE_RE.test(date) || !TIME_RE.test(startTime)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Invalid date or startTime format",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const gNameRaw = typeof guestName === "string" ? guestName.trim() : "";
    const gEmail = typeof guestEmail === "string" ? guestEmail.trim() : "";
    const gPhone =
      typeof guestPhone === "string" ? guestPhone.trim() : "";
    const referralCodeInput =
      typeof rawReferralCode === "string" ? rawReferralCode.trim().toUpperCase() : "";

    const isRegisteredBooking =
      typeof bodyPatientId === "string" && bodyPatientId.length > 0;

    let resolvedPatientId: string | null = isRegisteredBooking
      ? bodyPatientId
      : null;
    let registeredViaAuth = false;

    if (resolvedPatientId) {
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Unauthorized",
            meta: { timestamp: new Date().toISOString() },
          },
          { status: 401 },
        );
      }
      const owned = await prisma.therapyPatient.findFirst({
        where: { id: resolvedPatientId, profileId: user.id },
      });
      if (!owned) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: "Client profile mismatch",
            meta: { timestamp: new Date().toISOString() },
          },
          { status: 403 },
        );
      }
    } else if (user && !gNameRaw) {
      const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
      if (!patient) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error:
              "Client profile not found. Complete your profile or book as a guest.",
            meta: { timestamp: new Date().toISOString() },
          },
          { status: 403 },
        );
      }
      resolvedPatientId = patient.id;
      registeredViaAuth = true;
    } else {
      if (!gNameRaw || !gEmail) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: isAnonymous
              ? "Alias and email are required"
              : "Guest name, email, and phone are required",
            meta: { timestamp: new Date().toISOString() },
          },
          { status: 400 },
        );
      }

      if (!isAnonymous) {
        if (!gPhone) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              error: "Guest name, email, and phone are required",
              meta: { timestamp: new Date().toISOString() },
            },
            { status: 400 },
          );
        }
      }
    }

    const available = await getAvailableSlots(therapistId, date);
    if (!available.includes(startTime)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "This slot is no longer available",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 409 },
      );
    }

    const therapist = await prisma.therapyTherapist.findFirst({
      where: { id: therapistId, status: "approved" },
    });
    if (!therapist) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Therapist not found",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }

    const [h, m] = startTime.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + therapist.sessionDuration;
    const endTime = `${String(Math.floor(endMins / 60) % 24).padStart(2, "0")}:${String(endMins % 60).padStart(2, "0")}`;

    if (!resolvedPatientId) {
      const gName = String(guestName).trim();
      const gEmail = String(guestEmail).trim();
      const gPhoneRaw =
        typeof guestPhone === "string" ? guestPhone.trim() : "";
      const emailNorm = gEmail.toLowerCase();

      let existingGuest = await prisma.therapyPatient.findFirst({
        where: {
          profileId: null,
          email: { equals: emailNorm, mode: "insensitive" },
        },
        orderBy: { createdAt: "asc" },
      });

      if (!existingGuest && isGoogleHostedConsumerDomain(emailNorm)) {
        const canon = canonicalEmailForGuestMatch(emailNorm);
        const candidates = await prisma.therapyPatient.findMany({
          where: {
            profileId: null,
            OR: [
              { email: { endsWith: "@gmail.com", mode: "insensitive" } },
              { email: { endsWith: "@googlemail.com", mode: "insensitive" } },
            ],
          },
          orderBy: { createdAt: "asc" },
        });
        existingGuest =
          candidates.find((g) => canonicalEmailForGuestMatch(g.email) === canon) ??
          null;
      }

      if (existingGuest) {
        resolvedPatientId = existingGuest.id;
        await prisma.therapyPatient.update({
          where: { id: existingGuest.id },
          data: {
            fullName: gName,
            phone: existingGuest.phone || gPhoneRaw || "",
            email: emailNorm,
          },
        });
      } else {
        const guest = await prisma.therapyPatient.create({
          data: {
            fullName: gName,
            email: emailNorm,
            phone: gPhoneRaw || "",
          },
        });
        resolvedPatientId = guest.id;
      }
    }

    const isRegisteredPatient = isRegisteredBooking || registeredViaAuth;
    const trimmedGuestName = String(guestName ?? "").trim();
    const trimmedGuestEmail = String(guestEmail ?? "").trim();
    const trimmedGuestPhone =
      typeof guestPhone === "string" ? guestPhone.trim() : "";

    const patientForReferral = await prisma.therapyPatient.findUnique({
      where: { id: resolvedPatientId },
      select: { email: true },
    });
    const referralPatientEmail = (
      isRegisteredPatient ? patientForReferral?.email : trimmedGuestEmail
    )?.toLowerCase() ?? "";

    let referralAttach: {
      referralCode: string;
      referralPartnerId: string;
      isReferral: true;
    } | null = null;
    if (referralCodeInput && referralPatientEmail) {
      const partner = await prisma.referralPartner.findFirst({
        where: { referralCode: referralCodeInput, isActive: true },
      });
      if (partner) {
        const alreadyReferred = await prisma.referralSession.findFirst({
          where: {
            partnerId: partner.id,
            patientEmail: referralPatientEmail,
            status: { not: "voided" },
          },
        });
        if (!alreadyReferred) {
          referralAttach = {
            referralCode: partner.referralCode,
            referralPartnerId: partner.id,
            isReferral: true,
          };
        }
      }
    }

    let st =
      sessionType === "intake" || sessionType === "followup"
        ? sessionType
        : "followup";
    if (isRegisteredPatient) {
      const completedWithTherapist = await prisma.therapySession.count({
        where: {
          therapistId,
          patientId: resolvedPatientId!,
          status: "completed",
        },
      });
      st = completedWithTherapist === 0 ? "intake" : "followup";
    }

    const reasonStr =
      typeof guestBookingReason === "string" && guestBookingReason.trim()
        ? guestBookingReason.trim().slice(0, 500)
        : null;

    const professionalTypeStr =
      typeof rawProfessionalType === "string" && rawProfessionalType.trim()
        ? rawProfessionalType.trim().slice(0, 300)
        : null;

    const booking = await prisma.therapyBooking.create({
      data: {
        therapistId,
        patientId: resolvedPatientId,
        guestName: isRegisteredPatient ? null : trimmedGuestName,
        guestEmail: isRegisteredPatient ? null : trimmedGuestEmail,
        guestPhone: isRegisteredPatient
          ? null
          : trimmedGuestPhone || null,
        guestBookingReason: reasonStr,
        professionalType: professionalTypeStr,
        isAnonymous: isRegisteredPatient ? false : isAnonymous,
        clientAlias:
          isRegisteredPatient || !isAnonymous
            ? null
            : trimmedGuestName || null,
        date: watDayStart(date),
        startTime,
        endTime,
        sessionType: st,
        consentConfirmed: Boolean(consentConfirmed),
        consentTimestamp: consentTimestamp
          ? new Date(String(consentTimestamp))
          : null,
        status: "pending",
        paymentStatus: "pending",
        ...(referralAttach ?? {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: { bookingId: booking.id, packageType },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("Booking creation error:", e);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to create booking",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
