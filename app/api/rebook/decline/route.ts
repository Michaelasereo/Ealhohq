import { NextResponse } from "next/server";
import { z } from "zod";

import { firstName, normalizeNgDigits } from "@/lib/rebooking/phone";
import { prisma } from "@/lib/prisma/client";
import { sendWhatsAppText } from "@/lib/reminders/send-whatsapp";

const bodySchema = z.object({ requestId: z.string().uuid() }).strict();

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body" },
        { status: 400 },
      );
    }

    const { requestId } = parsed.data;
    const now = new Date();

    const row = await prisma.therapyRebookingRequest.findUnique({
      where: { id: requestId },
      include: {
        therapist: { include: { profile: true } },
        patient: true,
      },
    });

    if (!row || row.status !== "pending" || row.expiresAt < now) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }

    await prisma.therapyRebookingRequest.update({
      where: { id: requestId },
      data: { status: "declined", respondedAt: now },
    });

    const therapistPhone = normalizeNgDigits(
      row.therapist.profile.phone ?? null,
    );
    const pName = row.patient.fullName;
    const pFirst = firstName(pName);
    if (therapistPhone) {
      await sendWhatsAppText({
        toE164Digits: therapistPhone,
        body: `${pName} has declined the suggested session. You may want to reach out to reschedule.`,
      });
    }

    return NextResponse.json({ success: true, data: { patientFirstName: pFirst } });
  } catch (e) {
    console.error("rebook decline:", e);
    return NextResponse.json(
      { error: "Failed to decline" },
      { status: 500 },
    );
  }
}
