import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

const bodySchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  bio: z.string().min(1),
  specializations: z.array(z.string()).min(1),
  qualifications: z.array(z.string()).min(1),
  profilePhotoBase64: z.string().optional().nullable(),
});

function parseDataUrlImage(dataUrl: string): { bytes: Uint8Array; ext: string } | null {
  const m = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!m) return null;
  const extRaw = m[1].toLowerCase();
  const ext = extRaw === "jpeg" ? "jpg" : extRaw;
  try {
    const bytes = Uint8Array.from(Buffer.from(m[2], "base64"));
    if (bytes.byteLength === 0) return null;
    // Keep enrollment payload bounded.
    if (bytes.byteLength > 5 * 1024 * 1024) return null;
    return { bytes, ext };
  } catch {
    return null;
  }
}

/**
 * After OTP, the auth user exists but Prisma `therapy_therapists` was never created.
 * Call this once with the enroll draft so admin can see pending applications.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role =
      (user.app_metadata?.role as string | undefined) ??
      (await prisma.sharedProfile.findUnique({
        where: { id: user.id },
        select: { role: true },
      }))?.role;

    if (role !== "therapist") {
      return NextResponse.json({ error: "Not a therapist account" }, { status: 403 });
    }

    const json = (await req.json()) as unknown;
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid application data" },
        { status: 400 },
      );
    }
    const b = parsed.data;

    const existing = await prisma.therapyTherapist.findUnique({
      where: { profileId: user.id },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: { id: existing.id } });
    }

    await prisma.sharedProfile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        role: "therapist",
        fullName: b.fullName.trim(),
        phone: b.phone.trim(),
        status: "pending",
      },
      update: {
        role: "therapist",
        fullName: b.fullName.trim(),
        phone: b.phone.trim(),
        status: "pending",
      },
    });

    let profilePhotoUrl: string | null = null;
    if (typeof b.profilePhotoBase64 === "string" && b.profilePhotoBase64.trim()) {
      const parsedImage = parseDataUrlImage(b.profilePhotoBase64.trim());
      if (parsedImage) {
        const path = `${user.id}/profile.${parsedImage.ext}`;
        const { error: upErr } = await supabase.storage
          .from("profile-photos")
          .upload(path, parsedImage.bytes, {
            contentType: `image/${parsedImage.ext === "jpg" ? "jpeg" : parsedImage.ext}`,
            upsert: true,
          });
        if (!upErr) {
          const { data: pub } = supabase.storage
            .from("profile-photos")
            .getPublicUrl(path);
          profilePhotoUrl = pub.publicUrl;
        } else {
          console.error("complete-registration photo upload:", upErr);
        }
      }
    }

    const therapist = await prisma.therapyTherapist.create({
      data: {
        profileId: user.id,
        bio: b.bio.trim(),
        specializations: b.specializations,
        qualifications: b.qualifications,
        sessionRate: new Prisma.Decimal(20000),
        sessionDuration: 50,
        status: "pending",
        profilePhoto: profilePhotoUrl,
      },
    });

    return NextResponse.json({ success: true, data: { id: therapist.id } });
  } catch (e) {
    console.error("therapist/complete-registration:", e);
    return NextResponse.json(
      { error: "Could not save therapist application" },
      { status: 500 },
    );
  }
}
