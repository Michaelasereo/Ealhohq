import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin-api";
import { prisma } from "@/lib/prisma/client";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET(req: Request) {
  const gate = await requireAdminUser();
  if (gate.response) return gate.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim();

  try {
    const rows = await prisma.psychiatricReferral.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { include: { profile: true } },
        patient: { select: { id: true } },
        therapySession: { select: { id: true } },
        therapyBooking: { select: { id: true, status: true } },
        psychiatricSession: {
          select: {
            id: true,
            status: true,
            psychiatrist: { select: { id: true, name: true } },
          },
        },
      },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        status: r.status,
        clinicalReason: r.clinicalReason,
        adminNotes: r.adminNotes,
        createdAt: r.createdAt.toISOString(),
        therapistName: r.therapist.profile.fullName,
        patientIdShort: `${r.patient.id.slice(0, 8)}…`,
        therapySessionId: r.therapySessionId,
        bookingId: r.therapyBookingId,
        psychiatricSessionId: r.psychiatricSession?.id ?? null,
        psychiatristName: r.psychiatricSession?.psychiatrist.name ?? null,
      })),
    });
  } catch (e) {
    console.error("admin/psychiatric-referrals GET:", e);
    captureApiError(e, { route: "/admin/psychiatric-referrals" });
    return NextResponse.json(
      { success: false, error: "Failed to load referrals" },
      { status: 500 },
    );
  }
}
