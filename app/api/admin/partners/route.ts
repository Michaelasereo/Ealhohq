import crypto from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { isAdminUser } from "@/lib/auth/is-admin";
import { appBaseUrl } from "@/lib/app-url";
import { sendTransactionalEmail } from "@/lib/reminders/send-email";
import { suggestReferralCodeFromName, slugifyReferralName } from "@/lib/referral/slug";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partners = await prisma.referralPartner.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        referrals: { where: { status: "earned" }, select: { feeAmount: true } },
      },
    });
    return NextResponse.json({
      success: true,
      data: partners.map((p) => ({
        id: p.id,
        name: p.name,
        contactName: p.contactName,
        email: p.email,
        city: p.city,
        referralCode: p.referralCode,
        tier: p.tier,
        feePerSession: Number(p.feePerSession),
        isActive: p.isActive,
        totalReferred: p.totalReferred,
        totalEarned: Number(p.totalEarned),
        totalPaid: Number(p.totalPaid),
        pending: p.referrals.reduce((sum, r) => sum + Number(r.feeAmount), 0),
        bankName: p.bankName,
        accountName: p.accountName,
        accountNumber: p.accountNumber,
      })),
    });
  } catch (e) {
    console.error("admin/partners GET:", e);
    return NextResponse.json({ error: "Failed to load partners" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      name?: string;
      contactName?: string;
      email?: string;
      phone?: string;
      city?: string;
      address?: string;
      referralCode?: string;
      tier?: "standard" | "premium";
      feePerSession?: number;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
    };

    const name = body.name?.trim() ?? "";
    const contactName = body.contactName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() ?? "";
    const city = body.city?.trim() ?? "";
    if (!name || !contactName || !email || !phone || !city) {
      return NextResponse.json({ error: "name, contactName, email, phone, city are required" }, { status: 400 });
    }

    const tier = body.tier === "premium" ? "premium" : "standard";
    const feePerSession =
      typeof body.feePerSession === "number" && body.feePerSession > 0
        ? body.feePerSession
        : tier === "premium"
          ? 5000
          : 3000;
    const referralCode = (
      body.referralCode?.trim() || suggestReferralCodeFromName(name)
    )
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 32);
    const baseSlug = slugifyReferralName(name);
    const slug = `${baseSlug}-${crypto.randomBytes(2).toString("hex")}`.slice(0, 90);
    const tempPassword = crypto.randomBytes(8).toString("hex");

    const adminSb = createServiceRoleClient();
    const created = await adminSb.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      app_metadata: { role: "partner", status: "active" },
      user_metadata: { full_name: contactName },
    });
    if (created.error || !created.data.user) {
      return NextResponse.json(
        { error: created.error?.message ?? "Failed to create partner auth user" },
        { status: 500 },
      );
    }

    await prisma.sharedProfile.upsert({
      where: { id: created.data.user.id },
      update: { role: "partner", fullName: contactName, phone },
      create: { id: created.data.user.id, role: "partner", fullName: contactName, phone },
    });

    const partner = await prisma.referralPartner.create({
      data: {
        name,
        contactName,
        email,
        phone,
        address: body.address?.trim() || null,
        city,
        referralCode,
        referralSlug: slug,
        tier,
        feePerSession: new Prisma.Decimal(String(feePerSession)),
        bankName: body.bankName?.trim() || null,
        accountNumber: body.accountNumber?.trim() || null,
        accountName: body.accountName?.trim() || null,
      },
    });

    const appUrl = appBaseUrl() ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendTransactionalEmail({
      to: email,
      subject: "Welcome to the Ealho Partner Program",
      html: `
        <p>Hi ${contactName},</p>
        <p>Welcome to the Ealho Referral Partner Program.</p>
        <p><strong>Your referral details:</strong><br/>
        Link: ${appUrl}/book?ref=${partner.referralCode}<br/>
        Code: ${partner.referralCode}</p>
        <p><strong>How it works:</strong><br/>
        1. Share your link or code with patients<br/>
        2. They book directly on Ealho at ₦22,000/session<br/>
        3. You earn ₦${Math.round(Number(partner.feePerSession)).toLocaleString()} per completed first session<br/>
        4. Earnings are paid monthly to your bank account</p>
        <p>Log in to track referrals:<br/>${appUrl}/partners/dashboard</p>
        <p>Login: ${email}<br/>Temporary password: ${tempPassword}</p>
        <p>For support: hello@ealho.com</p>
      `,
    });

    return NextResponse.json({
      success: true,
      data: { id: partner.id, referralCode: partner.referralCode, referralSlug: partner.referralSlug },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Partner email, code, or slug already exists" }, { status: 409 });
    }
    console.error("admin/partners POST:", e);
    return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
  }
}
