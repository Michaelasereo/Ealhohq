"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CaptureReferralFromUrl } from "@/components/referral/CaptureReferralFromUrl";
import { Button } from "@/components/ui/button";
import { captureReferralCode } from "@/lib/referral/client";

type PartnerPayload = {
  name: string;
  city: string;
  tier: string;
  referralCode: string;
};

export default function ReferralLandingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const [partner, setPartner] = useState<PartnerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch(`/api/referral/partner/${encodeURIComponent(slug)}`);
      const j = (await r.json()) as {
        success?: boolean;
        data?: PartnerPayload;
        error?: string;
      };
      if (cancelled) return;
      if (!r.ok || !j.success || !j.data) {
        setError(j.error ?? "Referral page unavailable");
        return;
      }
      setPartner(j.data);
      captureReferralCode(j.data.referralCode);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="text-sm text-destructive">{error}</p>
      </main>
    );
  }
  if (!partner) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-8">
      <CaptureReferralFromUrl />
      <h1 className="text-2xl font-semibold leading-tight">
        {partner.name} has partnered with Ealho Therapy
      </h1>
      <p className="text-sm text-muted-foreground">
        to provide confidential mental health support for their patients in{" "}
        {partner.city}.
      </p>

      <div className="rounded-2xl border bg-white p-4">
        <p className="text-sm font-medium">Book your first session at ₦22,000</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div className="rounded-xl border p-3">Licensed therapists</div>
        <div className="rounded-xl border p-3">Confidential sessions</div>
        <div className="rounded-xl border p-3">AI-assisted notes</div>
        <div className="rounded-xl border p-3">NDPA compliant</div>
      </div>

      <Link href={`/book?ref=${encodeURIComponent(partner.referralCode)}`}>
        <Button className="min-h-12 w-full">Book Your Session</Button>
      </Link>
    </main>
  );
}
