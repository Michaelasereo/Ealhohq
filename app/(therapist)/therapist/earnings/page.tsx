"use client";

import { DollarSign } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type EarningsPayload = {
  sessionRate: number;
  totals: { allTime: number; thisMonth: number; thisWeek: number };
  sessions: {
    id: string;
    date: string;
    patientName: string;
    sessionType: string;
    amount: number;
  }[];
};

async function fetchEarnings(): Promise<EarningsPayload> {
  const r = await fetch("/api/therapist/earnings", { credentials: "include" });
  const j = (await r.json()) as {
    success?: boolean;
    data?: EarningsPayload;
    error?: string;
  };
  if (!r.ok) throw new Error(j.error ?? "Failed to load");
  return j.data!;
}

export default function TherapistEarningsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["therapist-earnings"],
    queryFn: fetchEarnings,
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Error"}
        </p>
      </main>
    );
  }

  const { totals, sessions } = data;

  if (sessions.length === 0) {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-4 pb-20">
        <header>
          <h1 className="text-2xl font-semibold">Earnings</h1>
          <p className="text-sm text-muted-foreground">Paid completed sessions (NGN).</p>
        </header>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <DollarSign className="size-12 text-gray-300" strokeWidth={1.5} />
            <p className="font-semibold">No earnings yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your earnings will appear here after your first completed, paid session.
            </p>
            <Link
              href="/therapist/availability"
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-12",
              )}
            >
              Set up availability
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-8 p-4 pb-20">
      <header>
        <h1 className="text-2xl font-semibold">Earnings</h1>
        <p className="text-sm text-muted-foreground">
          Totals from paid, completed sessions (WAT dates).
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">All time</p>
            <p className="text-xl font-bold tabular-nums">
              ₦{totals.allTime.toLocaleString("en-NG")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">This month</p>
            <p className="text-xl font-bold tabular-nums">
              ₦{totals.thisMonth.toLocaleString("en-NG")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Last 7 days</p>
            <p className="text-xl font-bold tabular-nums">
              ₦{totals.thisWeek.toLocaleString("en-NG")}
            </p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Paid sessions</h2>
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{s.patientName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {new Date(s.date).toLocaleDateString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}{" "}
                  · {s.sessionType === "intake" ? "Intake" : "Follow-up"}
                </p>
              </div>
              <span className="font-semibold tabular-nums">
                ₦{s.amount.toLocaleString("en-NG")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
