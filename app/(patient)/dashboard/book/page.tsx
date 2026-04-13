"use client";

import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import {
  TherapistCard,
  TherapistCardSkeleton,
} from "@/components/booking/TherapistCard";
import { CapturePartnerBookParams } from "@/components/referral/CapturePartnerBookParams";
import { CaptureReferralFromUrl } from "@/components/referral/CaptureReferralFromUrl";

type TherapistRow = {
  id: string;
  profile: { fullName: string };
  profilePhoto: string | null;
  specializations: string[];
  sessionRateFormatted: string;
  sessionDuration: number;
};

export default function PatientBookPage() {
  const { data: me } = useQuery({
    queryKey: ["patient-me"],
    queryFn: async () => {
      const r = await fetch("/api/patient/me");
      if (r.status === 401) return null;
      const j = (await r.json()) as {
        success: boolean;
        data?: {
          patient: { firstName: string } | null;
          profile: { fullName: string } | null;
          sessions: { therapist: { id: string } }[];
        };
      };
      if (!r.ok || !j.success) return null;
      return j.data ?? null;
    },
  });

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

  const seen = new Set((me?.sessions ?? []).map((s) => s.therapist.id));
  const ordered = [...(data ?? [])].sort(
    (a, b) => Number(seen.has(b.id)) - Number(seen.has(a.id)),
  );

  const greet =
    me?.patient?.firstName ??
    me?.profile?.fullName?.trim().split(/\s+/)[0] ??
    "there";

  return (
    <main className="mx-auto min-h-screen w-full max-w-md p-4">
      <CaptureReferralFromUrl />
      <Suspense fallback={null}>
        <CapturePartnerBookParams />
      </Suspense>
      <h1 className="text-xl font-semibold">Welcome back {greet}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose your therapist</p>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          <TherapistCardSkeleton />
          <TherapistCardSkeleton />
        </div>
      ) : isError ? (
        <p className="mt-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {ordered.map((t) => (
            <TherapistCard
              key={t.id}
              therapist={t}
              bookHref={`/dashboard/book/${t.id}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
