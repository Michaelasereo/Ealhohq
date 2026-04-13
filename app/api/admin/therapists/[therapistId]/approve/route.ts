import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { sendTherapistApprovalEmail } from "@/lib/reminders/send-email";

import { captureApiError } from "@/lib/sentry/capture";
type Ctx = { params: Promise<{ therapistId: string }> };

export async function PUT(_req: Request, ctx: Ctx) {
  try {
    const { therapistId } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const therapist = await prisma.therapyTherapist.update({
      where: { id: therapistId },
      data: { status: "approved" },
      include: { profile: true },
    });

    const adminSupabase = createAdminClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existing, error: getErr } =
      await adminSupabase.auth.admin.getUserById(therapist.profileId);
    if (getErr) {
      console.error("getUserById:", getErr);
      return NextResponse.json(
        { error: "Failed to sync auth user" },
        { status: 500 },
      );
    }

    const prevMeta =
      (existing.user?.app_metadata as Record<string, unknown> | undefined) ??
      {};

    const { error: updErr } = await adminSupabase.auth.admin.updateUserById(
      therapist.profileId,
      {
        app_metadata: {
          ...prevMeta,
          role: "therapist",
          status: "approved",
        },
      },
    );
    if (updErr) {
      console.error("updateUserById:", updErr);
      return NextResponse.json(
        { error: "Failed to update user metadata" },
        { status: 500 },
      );
    }

    await prisma.sharedProfile.update({
      where: { id: therapist.profileId },
      data: { status: "active" },
    });

    const approvalEmail = existing.user?.email?.trim();
    if (approvalEmail) {
      const sent = await sendTherapistApprovalEmail(approvalEmail);
      if (!sent.success) {
        console.error("Therapist approval email:", sent.error);
        captureApiError(sent.error ?? new Error("approval email failed"), {
          route: "/admin/therapists/[therapistId]/approve",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Approve therapist:", e);
    captureApiError(e, { route: "/admin/therapists/[therapistId]/approve" });
    return NextResponse.json(
      { error: "Failed to approve therapist" },
      { status: 500 },
    );
  }
}
