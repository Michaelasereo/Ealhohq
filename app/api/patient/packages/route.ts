import { NextResponse } from "next/server";

import { ensureRegisteredPatientForUser } from "@/lib/queries/patient";
import { prisma } from "@/lib/prisma/client";
import { createClient } from "@/lib/supabase/server";
import { therapistPublicLabel } from "@/lib/therapist-display-name";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const patient = (await ensureRegisteredPatientForUser(user))?.patient ?? null;
    if (!patient) {
      return NextResponse.json({
        success: true,
        data: { packages: [] },
        error: null,
        meta: { timestamp: new Date().toISOString() },
      });
    }

    const packages = await prisma.therapySessionPackage.findMany({
      where: {
        patientId: patient.id,
        status: "active",
        remainingSessions: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        therapist: { include: { profile: { select: { fullName: true } } } },
        bookings: {
          select: {
            id: true,
            date: true,
            startTime: true,
            status: true,
            paymentStatus: true,
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        packages: packages.map((pkg) => ({
          id: pkg.id,
          packageType: pkg.packageType,
          totalSessions: pkg.totalSessions,
          usedSessions: pkg.usedSessions,
          remainingSessions: pkg.remainingSessions,
          expiresAt: pkg.expiresAt?.toISOString() ?? null,
          therapist: {
            id: pkg.therapist.id,
            name: therapistPublicLabel(pkg.therapist.profile.fullName),
            photo: pkg.therapist.profilePhoto ?? "/Ealho-logo.png",
          },
          bookings: pkg.bookings.map((b) => ({
            id: b.id,
            date: b.date.toISOString(),
            startTime: b.startTime,
            status: b.status,
            paymentStatus: b.paymentStatus,
          })),
        })),
      },
      error: null,
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (e) {
    console.error("patient/packages GET:", e);
    captureApiError(e, { route: "/patient/packages" });
    return NextResponse.json(
      { success: false, error: "Failed to fetch packages" },
      { status: 500 },
    );
  }
}
