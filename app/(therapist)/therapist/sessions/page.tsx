"use client";

import {
  Calendar,
  ClipboardCheck,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnonymousBadge } from "@/components/therapist/AnonymousBadge";
import { canJoinSessionWindow } from "@/lib/session/join-access";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { getDisplayName } from "@/lib/utils/patient-display";
import { cn } from "@/lib/utils";

type BookingRow = {
  id: string;
  guestName: string | null;
  isAnonymous: boolean;
  clientAlias: string | null;
  professionalType: string | null;
  startTime: string;
  endTime: string;
  date: string;
  status: string;
  sessionType: string;
  patient: { id: string; fullName: string; email: string } | null;
  session: {
    id: string;
    sessionNumber: number;
    status: string;
    notesGenerated: boolean;
    note: {
      id: string;
      noteType: string;
      isEdited: boolean;
      editedAt: string | null;
    } | null;
  } | null;
};

async function fetchSessions(
  filter: "upcoming" | "completed" | "all",
): Promise<BookingRow[]> {
  const r = await fetch(
    `/api/therapist/sessions?filter=${filter}`,
    { credentials: "include" },
  );
  const j = (await r.json()) as {
    success?: boolean;
    data?: BookingRow[];
    error?: string;
  };
  if (!r.ok) throw new Error(j.error ?? "Failed to load");
  return j.data ?? [];
}

function SessionCard({
  b,
  mode,
}: {
  b: BookingRow;
  mode: "upcoming" | "completed" | "all";
}) {
  const queryClient = useQueryClient();
  const bookingDate = new Date(b.date);
  const iso = bookingDateStartToIso(bookingDate, b.startTime);
  const joinOk =
    b.status === "confirmed" &&
    canJoinSessionWindow(bookingDate, b.startTime, b.endTime);
  const joinHref = `/session/join?bookingId=${b.id}`;

  const cancelMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/sessions/cancel", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: b.id,
          cancelledBy: "therapist",
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!r.ok || !j.success) {
        throw new Error(j.error ?? "Cancel failed");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["therapist-sessions"] });
    },
  });

  const notesReady =
    b.session?.notesGenerated && b.session?.note;
  const postHref = b.session
    ? `/therapist/sessions/${b.session.id}/post-session`
    : null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">
                {getDisplayName({
                  isAnonymous: b.isAnonymous,
                  clientAlias: b.clientAlias,
                  guestName: b.guestName,
                  patient: b.patient,
                })}
              </p>
              {b.isAnonymous ? <AnonymousBadge /> : null}
              {b.professionalType ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {b.professionalType}
                </span>
              ) : null}
            </div>
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
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                {b.status}
              </span>
            </div>
          </div>
        </div>

        {mode === "upcoming" &&
        (b.status === "confirmed" || b.status === "pending") ? (
          <div className="flex flex-wrap gap-2">
            {b.status === "confirmed" && joinOk ? (
              <Link
                href={joinHref}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "min-h-12 bg-emerald-600 hover:bg-emerald-700",
                )}
              >
                Join
              </Link>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              disabled={cancelMut.isPending}
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    "Cancel this session? The client will receive a full refund or credit back, plus one complimentary credit, per our policy.",
                  )
                ) {
                  cancelMut.mutate();
                }
              }}
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel"}
            </Button>
          </div>
        ) : null}

        {mode === "completed" && b.session ? (
          <div className="flex flex-wrap gap-2">
            {notesReady ? (
              <span className="inline-flex items-center rounded-full border border-[var(--figma-bg-pill)] bg-[var(--ealho-cream)] px-3 py-1.5 text-xs font-medium text-[var(--figma-text)] dark:border-border dark:bg-muted/40 dark:text-foreground">
                Notes ready
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Notes pending
              </span>
            )}
            <Link
              href={postHref!}
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-12",
              )}
            >
              View notes
            </Link>
            {!b.session.notesGenerated ? (
              <Link
                href={`${postHref}?manual=true`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-12",
                )}
              >
                Write notes
              </Link>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function TherapistSessionsPage() {
  const [tab, setTab] = useState<"upcoming" | "completed" | "all">("upcoming");
  const filter = tab;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["therapist-sessions", filter],
    queryFn: () => fetchSessions(filter),
  });

  const copyBookLink = useCallback(() => {
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}/book`
        : "/book";
    void navigator.clipboard.writeText(base);
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 p-4 pb-20">
      <header>
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming and past bookings (WAT).
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="min-h-12">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed" className="min-h-12">
            Completed
          </TabsTrigger>
          <TabsTrigger value="all" className="min-h-12">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Error"}
            </p>
          ) : data && data.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <Calendar className="size-12 text-gray-300" strokeWidth={1.5} />
                <p className="font-semibold">No upcoming sessions</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Sessions will appear here once clients book.
                </p>
                <Button
                  type="button"
                  className="min-h-12 gap-2"
                  onClick={() => void copyBookLink()}
                >
                  <Copy className="size-4" strokeWidth={1.5} />
                  Share your booking link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data!.map((b) => (
                <SessionCard key={b.id} b={b} mode="upcoming" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Error"}
            </p>
          ) : data && data.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <ClipboardCheck className="size-12 text-gray-300" strokeWidth={1.5} />
                <p className="font-semibold">No completed sessions yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Completed sessions and their notes will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data!.map((b) => (
                <SessionCard key={b.id} b={b} mode="completed" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6 space-y-4">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : isError ? (
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Error"}
            </p>
          ) : data && data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions found.</p>
          ) : (
            <div className="space-y-3">
              {data!.map((b) => (
                <SessionCard key={b.id} b={b} mode="all" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
