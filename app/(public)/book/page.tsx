"use client";

import { useQuery } from "@tanstack/react-query";

import {
  TherapistCard,
  TherapistCardSkeleton,
} from "@/components/booking/TherapistCard";

type TherapistRow = {
  id: string;
  profile: { fullName: string };
  profilePhoto: string | null;
  specializations: string[];
  sessionRateFormatted: string;
  sessionDuration: number;
};

export default function GuestBookPage() {
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
      <h1 className="text-xl font-semibold">Book a Therapy Session</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All times shown in West Africa Time (WAT).
      </p>

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
