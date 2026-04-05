"use client";

import { Calendar, ClipboardList } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canJoinSessionTenMinutesBefore } from "@/lib/patient/join-eligibility";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  sessionType: string;
  therapist: { id: string; name: string; photo: string };
  session: {
    id: string;
    sessionNumber: number;
    feedbackSubmitted: boolean;
  } | null;
};

async function fetchSessions(): Promise<{ upcoming: Row[]; past: Row[] }> {
  const r = await fetch("/api/patient/sessions", { credentials: "include" });
  const j = (await r.json()) as {
    success?: boolean;
    data?: { upcoming: Row[]; past: Row[] };
    error?: string;
  };
  if (!r.ok) throw new Error(j.error ?? "Failed to load");
  return j.data ?? { upcoming: [], past: [] };
}

function UpcomingCard({ b }: { b: Row }) {
  const qc = useQueryClient();
  const bookingDate = new Date(b.date);
  const iso = bookingDateStartToIso(bookingDate, b.startTime);
  const joinOk = canJoinSessionTenMinutesBefore(bookingDate, b.startTime);
  const msUntil = new Date(iso).getTime() - Date.now();
  const canCancel = msUntil > 24 * 60 * 60 * 1000;

  const cancelMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patient/bookings/${b.id}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Cancel failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["patient-sessions-list"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard-home"] });
    },
  });

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-3">
          <Image
            src={b.therapist.photo}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-full object-cover"
            unoptimized={b.therapist.photo.startsWith("http")}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{b.therapist.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatWAT(iso)} WAT
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  b.sessionType === "intake"
                    ? "bg-blue-100 text-blue-900"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {b.sessionType === "intake" ? "Intake" : "Follow-up"}
              </span>
              {b.session ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  Session {b.session.sessionNumber}
                </span>
              ) : null}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                {b.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {joinOk ? (
            <Link
              href={`/session/join?bookingId=${b.id}`}
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-12 w-full",
              )}
            >
              Join
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Starts {formatWAT(iso)} WAT
            </p>
          )}
          {canCancel ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              disabled={cancelMut.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Cancel this session? Credits may be refunded if applicable.",
                  )
                ) {
                  cancelMut.mutate();
                }
              }}
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PastCard({ b }: { b: Row }) {
  const bookingDate = new Date(b.date);
  const iso = bookingDateStartToIso(bookingDate, b.startTime);
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex gap-3">
          <Image
            src={b.therapist.photo}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-full object-cover"
            unoptimized={b.therapist.photo.startsWith("http")}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{b.therapist.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatWAT(iso)} WAT
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Session {b.session?.sessionNumber ?? "—"} ·{" "}
              {b.sessionType === "intake" ? "Intake" : "Follow-up"}
            </p>
          </div>
        </div>
        {b.session && !b.session.feedbackSubmitted ? (
          <Link
            href={`/sessions/${b.session.id}/feedback`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "flex min-h-12 w-full justify-center",
            )}
          >
            Leave feedback
          </Link>
        ) : b.session?.feedbackSubmitted ? (
          <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium">
            Feedback submitted
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function PatientSessionsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["patient-sessions-list"],
    queryFn: fetchSessions,
  });

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 p-4 pb-24 md:pb-8">
      <header>
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming and past (West Africa Time).
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="min-h-12">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="min-h-12">
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Error"}
            </p>
          ) : data && data.upcoming.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <Calendar className="size-12 text-primary/30" strokeWidth={1.5} />
                <p className="font-semibold">No upcoming sessions</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Book your next session and it will appear here.
                </p>
                <Link
                  href="/book"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "min-h-12 w-full max-w-sm",
                  )}
                >
                  Book a session
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data?.upcoming.map((b) => (
                <UpcomingCard key={b.id} b={b} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Error"}
            </p>
          ) : data && data.past.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <ClipboardList className="size-12 text-primary/30" strokeWidth={1.5} />
                <p className="font-semibold">No past sessions yet</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Your completed sessions will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data?.past.map((b) => (
                <PastCard key={b.id} b={b} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
