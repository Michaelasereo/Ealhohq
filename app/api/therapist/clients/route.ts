import { NextResponse } from "next/server";

import { getTherapistByProfileId } from "@/lib/queries/patient";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { getDisplayName } from "@/lib/utils/patient-display";

import { captureApiError } from "@/lib/sentry/capture";
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const therapist = await getTherapistByProfileId(user.id);
    if (!therapist) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") ?? "").trim();

    const clients = await prisma.therapyPatient.findMany({
      where: {
        bookings: { some: { therapistId: therapist.id } },
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        bookings: {
          where: { therapistId: therapist.id },
          orderBy: { date: "desc" },
          take: 1,
          select: {
            date: true,
            startTime: true,
            isAnonymous: true,
            clientAlias: true,
            guestName: true,
          },
        },
        _count: {
          select: {
            bookings: {
              where: { therapistId: therapist.id },
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    });

    const mapped = clients.map((c) => {
      const latest = c.bookings[0];
      const anon = Boolean(latest?.isAnonymous);
      const displayName = latest
        ? getDisplayName({
            isAnonymous: latest.isAnonymous,
            clientAlias: latest.clientAlias,
            guestName: latest.guestName,
            patient: { fullName: c.fullName },
          })
        : c.fullName;
      return {
        ...c,
        fullName: displayName,
        email: anon ? "" : c.email,
        isAnonymous: anon,
      };
    });

    return NextResponse.json({ success: true, data: mapped });
  } catch (e) {
    console.error("Therapist clients list:", e);
    captureApiError(e, { route: "/therapist/clients" });
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 },
    );
  }
}
