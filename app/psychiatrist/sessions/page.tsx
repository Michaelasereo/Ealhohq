"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";

type Row = {
  id: string;
  bookingId: string;
  patientIdShort: string;
  bookingStatus: string;
  paymentStatus: string;
  date: string;
  startTime: string;
  endTime: string;
  clinicalReason: string;
};

export default function PsychiatristSessionsPage() {
  const q = useQuery({
    queryKey: ["psychiatrist-sessions"],
    queryFn: async () => {
      const r = await fetch("/api/psychiatrist/sessions", {
        credentials: "include",
      });
      const j = (await r.json()) as { success?: boolean; data?: Row[] };
      if (!r.ok || !j.success) throw new Error("Failed to load");
      return j.data ?? [];
    },
  });

  if (q.isLoading) {
    return (
      <main className="mx-auto flex max-w-lg items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (q.isError) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <p className="text-sm text-destructive">
          {q.error instanceof Error ? q.error.message : "Error"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          If you just received access, sign out and sign in again.
        </p>
      </main>
    );
  }

  const rows = q.data ?? [];

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-16">
      <h1 className="text-xl font-semibold">Your assessments</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No upcoming psychiatric sessions. You will see referrals here when
          admin schedules you.
        </p>
      ) : (
        rows.map((r) => {
          const startIso = bookingDateStartToIso(new Date(r.date), r.startTime);
          const paid = r.paymentStatus === "paid" || r.paymentStatus === "package_credit";
          return (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-4 text-sm">
                <p className="font-medium">Client {r.patientIdShort}</p>
                <p className="text-muted-foreground">{formatWAT(startIso)}</p>
                <p className="text-xs text-muted-foreground">
                  Booking: {r.bookingStatus} · Payment: {r.paymentStatus}
                </p>
                <p className="rounded-md bg-muted/60 p-2 text-xs">
                  <span className="font-medium">Referral: </span>
                  {r.clinicalReason.slice(0, 220)}
                  {r.clinicalReason.length > 220 ? "…" : ""}
                </p>
                {paid ? (
                  <Link
                    href={`/psychiatrist/sessions/${r.id}/complete`}
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "flex h-12 w-full items-center justify-center",
                    )}
                  >
                    Open post-session form
                  </Link>
                ) : (
                  <p className="text-xs text-amber-800">
                    Post-session form unlocks after the client pays and the
                    session is confirmed.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </main>
  );
}
