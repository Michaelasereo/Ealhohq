"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AnonymousBadge } from "@/components/therapist/AnonymousBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { canJoinSessionWindow } from "@/lib/session/join-access";
import { minutesUntilSessionStart } from "@/lib/session/join-access";
import { formatWAT } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";

type SessionPayload = {
  id: string;
  bookingId: string;
  dateIso: string;
  startTime: string;
  endTime: string;
  durationMins: number;
  type: string;
  sessionStatus: string;
  bookingStatus: string;
  notesGenerated: boolean;
  sessionNumber: number;
  patient: { id: string; fullName: string; email: string; phone: string };
  booking: { id: string; isAnonymous: boolean; clientId: string };
};

export default function TherapistSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["therapist-session", sessionId],
    queryFn: async () => {
      const r = await fetch(`/api/therapist/sessions/${sessionId}`, {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success: boolean;
        data?: SessionPayload;
        error?: string;
      };
      if (!r.ok || !j.success || !j.data) {
        throw new Error(j.error ?? "Failed to load session");
      }
      return j.data;
    },
    enabled: Boolean(sessionId),
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/therapist/sessions/${sessionId}/cancel`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadMinutes: 120 }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Cancel failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["therapist-sessions"] });
      void qc.invalidateQueries({ queryKey: ["therapist-dashboard"] });
      router.push("/therapist/sessions");
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Error"}
        </p>
      </main>
    );
  }

  const joinHref = `/session/join?bookingId=${data.bookingId}`;
  const notesHref = `/therapist/sessions/${data.id}/post-session`;
  const bookingDate = new Date(data.dateIso);
  const minsUntil = minutesUntilSessionStart(
    bookingDate,
    data.startTime,
  );
  const cancelAllowed = minsUntil > 120 && data.bookingStatus === "confirmed";
  const upcoming = data.bookingStatus === "confirmed";

  const joinOk =
    data.bookingStatus === "confirmed" &&
    canJoinSessionWindow(bookingDate, data.startTime, data.endTime);

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl space-y-6 p-4 pb-16">
      <div>
        <h1 className="text-xl font-semibold">Session detail</h1>
        <p className="text-sm text-muted-foreground">
          Session {data.sessionNumber} · {formatWAT(data.dateIso)} WAT
        </p>
      </div>

      <section className="rounded-xl border bg-card p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-medium">{data.patient.fullName}</p>
          {data.booking.isAnonymous ? <AnonymousBadge /> : null}
        </div>
        {data.patient.email ? (
          <p className="text-muted-foreground">{data.patient.email}</p>
        ) : (
          <p className="text-muted-foreground">
            Email not shared (anonymous session)
          </p>
        )}
        <p className="mt-2 capitalize">
          {data.type} · {data.durationMins} minutes
        </p>
        <p className="mt-1 capitalize text-muted-foreground">
          Booking: {data.bookingStatus} · Session: {data.sessionStatus}
        </p>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-sm font-medium">Actions</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {upcoming && joinOk ? (
            <Link
              href={joinHref}
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-12 bg-emerald-600 hover:bg-emerald-700",
              )}
            >
              Join session
            </Link>
          ) : null}
          {upcoming && !joinOk ? (
            <Button type="button" className="min-h-12" disabled>
              Join opens in window
            </Button>
          ) : null}
          {data.bookingStatus === "completed" && data.notesGenerated ? (
            <Link
              href={notesHref}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "min-h-12",
              )}
            >
              View notes
            </Link>
          ) : null}
          {data.bookingStatus === "completed" && !data.notesGenerated ? (
            <Link
              href={`${notesHref}?manual=true`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "min-h-12",
              )}
            >
              Write notes
            </Link>
          ) : null}
          {cancelAllowed ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-12 text-destructive"
              disabled={cancelMut.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Cancel this session? This cannot be undone from here.",
                  )
                ) {
                  cancelMut.mutate();
                }
              }}
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel session"}
            </Button>
          ) : null}
        </div>
      </section>

      {data.patient.id ? (
        <section className="rounded-xl border bg-card p-4 text-sm">
          <Link
            href={`/therapist/clients/${data.patient.id}`}
            className="font-medium text-primary underline"
          >
            View full client profile
          </Link>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Guest booking — no client profile.</p>
      )}

      {upcoming ? (
        <section className="rounded-xl border bg-card p-4 text-sm">
          <p className="mb-2 font-medium">Pre-session checklist</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>Camera and microphone tested</li>
            <li>Quiet, private space</li>
            <li>Session materials ready</li>
          </ul>
        </section>
      ) : null}

      <Link
        href="/therapist/sessions"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "inline-flex min-h-12",
        )}
      >
        ← All sessions
      </Link>
    </main>
  );
}
