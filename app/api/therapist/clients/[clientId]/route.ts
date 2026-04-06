import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { bookingDateStartToIso } from "@/lib/wat-datetime";
import { getDisplayName } from "@/lib/utils/patient-display";

type Ctx = { params: Promise<{ clientId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { clientId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Forbidden",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 403 },
      );
    }

    const bookingLink = await prisma.therapyBooking.count({
      where: { therapistId: therapist.id, patientId: clientId },
    });
    if (bookingLink === 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Client not found",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }

    const patient = await prisma.therapyPatient.findUnique({
      where: { id: clientId },
      include: { profile: true, medicalHistory: true },
    });
    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "Client not found",
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 404 },
      );
    }

    const bookings = await prisma.therapyBooking.findMany({
      where: { therapistId: therapist.id, patientId: clientId },
      include: {
        session: {
          include: { note: { select: { id: true } } },
        },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
    });

    const sessionRows = bookings
      .filter((b) => b.session)
      .map((b) => {
        const s = b.session!;
        return {
          id: s.id,
          dateIso: bookingDateStartToIso(b.date, b.startTime),
          sessionNumber: s.sessionNumber,
          type: b.sessionType === "intake" ? "intake" : "follow-up",
          durationMins: s.durationMinutes ?? therapist.sessionDuration,
          status: s.status,
          notesGenerated: s.notesGenerated,
          hasNote: Boolean(s.note),
        };
      });

    const dates = sessionRows.map((s) => s.dateIso);
    const firstSession = dates[dates.length - 1];
    const lastSession = dates[0];

    const mh = patient.medicalHistory;
    const activePackage = await prisma.therapySessionPackage.findFirst({
      where: {
        patientId: clientId,
        therapistId: therapist.id,
        status: "active",
        remainingSessions: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        packageType: true,
        totalSessions: true,
        remainingSessions: true,
        expiresAt: true,
      },
    });
    const anonBooking = bookings.find((b) => b.isAnonymous);
    const hasAnonymous = Boolean(anonBooking);
    const displayName = anonBooking
      ? getDisplayName({
          isAnonymous: true,
          clientAlias: anonBooking.clientAlias,
          guestName: anonBooking.guestName,
          patient: {
            fullName: patient.profile?.fullName ?? patient.fullName,
          },
        })
      : patient.profile?.fullName ?? patient.fullName;

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          fullName: displayName,
          email: hasAnonymous ? "" : patient.email,
          phone: hasAnonymous ? "" : patient.phone,
          gender: patient.gender ?? "",
          occupation: patient.occupation ?? "",
        },
        medicalHistory: mh
          ? {
              currentMedications: mh.currentMedications,
              allergies: mh.allergies,
              previousDiagnoses: mh.previousDiagnoses,
              previousTherapy: mh.previousTherapy,
              familyMedical: mh.familyMedical,
              familyPsychiatric: mh.familyPsychiatric,
              familySubstanceUse: mh.familySubstanceUse,
            }
          : null,
        sessions: sessionRows,
        bookingsWithoutSession: bookings
          .filter((b) => !b.session)
          .map((b) => ({
            bookingId: b.id,
            dateIso: bookingDateStartToIso(b.date, b.startTime),
            status: b.status,
            sessionType: b.sessionType,
          })),
        sessionCount: sessionRows.length,
        firstSessionDate: firstSession?.slice(0, 10) ?? null,
        lastSessionDate: lastSession?.slice(0, 10) ?? null,
        activePackage: activePackage
          ? {
              id: activePackage.id,
              packageType: activePackage.packageType,
              totalSessions: activePackage.totalSessions,
              remainingSessions: activePackage.remainingSessions,
              expiresAt: activePackage.expiresAt?.toISOString() ?? null,
            }
          : null,
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("therapist client GET:", e);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Failed to load client",
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 },
    );
  }
}
