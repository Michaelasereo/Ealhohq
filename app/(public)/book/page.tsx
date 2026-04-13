"use client";

import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import {
  TherapistCard,
  TherapistCardSkeleton,
} from "@/components/booking/TherapistCard";
import { CaptureReferralFromUrl } from "@/components/referral/CaptureReferralFromUrl";
import { CapturePartnerBookParams } from "@/components/referral/CapturePartnerBookParams";

type TherapistRow = {
  id: string;
  profile: { fullName: string };
  profilePhoto: string | null;
  specializations: string[];
  sessionRateFormatted: string;
  sessionDuration: number;
};

function BookPageInner() {
  const searchParams = useSearchParams();
  const t = searchParams.get("type")?.toLowerCase() ?? "";
  const title =
    t === "clinician"
      ? "Therapy built for clinicians"
      : t === "general" || t === "non_clinician" || t === "non-clinician"
        ? "Therapy built just for you"
        : "Book a Therapy Session";
  const subtitle =
    t === "clinician" || t === "general" || t === "non_clinician" || t === "non-clinician"
      ? "All times in West Africa Time (WAT)."
      : "All times shown in West Africa Time (WAT).";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["booking-therapists"],
    queryFn: async () => {
      const r = await fetch("/api/booking/therapists");
      const j = (await r.json()) as {
        success: boolean;
        data?: TherapistRow[];
        error?: string;
      };
      if (!r.ok || !j.success || !j.data) {
        throw new Error(j.error ?? "Failed to load therapists");
      }
      return j.data;
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-md p-4">
      <CaptureReferralFromUrl />
      <Suspense fallback={null}>
        <CapturePartnerBookParams />
      </Suspense>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <TherapistCardSkeleton />
          <TherapistCardSkeleton />
          <TherapistCardSkeleton />
        </div>
      ) : isError ? (
        <p className="mt-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {(data ?? []).map((t) => (
            <TherapistCard
              key={t.id}
              therapist={t}
              bookHref={`/book/${t.id}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}

export default function GuestBookPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen w-full max-w-md p-4">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <BookPageInner />
    </Suspense>
  );
}
