import { NextResponse } from "next/server";

import { requirePsychiatristUser } from "@/lib/auth/require-psychiatrist-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET() {
  const gate = await requirePsychiatristUser();
  if (gate.response) return gate.response;
  const psychiatrist = gate.psychiatrist;
  if (!psychiatrist) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await prisma.psychiatricSession.findMany({
      where: {
        psychiatristId: psychiatrist.id,
        status: { in: ["scheduled"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
            paymentStatus: true,
          },
        },
        patient: { select: { id: true } },
        referral: { select: { clinicalReason: true } },
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        patientIdShort: `${r.patient.id.slice(0, 8)}…`,
        bookingStatus: r.booking.status,
        paymentStatus: r.booking.paymentStatus,
        date: r.booking.date.toISOString(),
        startTime: r.booking.startTime,
        endTime: r.booking.endTime,
        clinicalReason: r.referral.clinicalReason,
      })),
    });
  } catch (e) {
    console.error("psychiatrist/sessions GET:", e);
    captureApiError(e, { route: "/psychiatrist/sessions" });
    return NextResponse.json(
      { success: false, error: "Failed to load sessions" },
      { status: 500 },
    );
  }
}
