"use client";

import { Calendar, ClipboardList, RefreshCw, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  paidWithCredits: boolean;
  rescheduleCount: number;
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
  const hoursUntil = msUntil / (1000 * 60 * 60);
  const canCancel = hoursUntil > 0;
  const canReschedule = hoursUntil > 2 && b.rescheduleCount < 2;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelErr, setCancelErr] = useState<string | null>(null);
  const [selectedYmd, setSelectedYmd] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [rescheduleErr, setRescheduleErr] = useState<string | null>(null);

  const refundHint =
    hoursUntil > 24
      ? b.paidWithCredits
        ? "Full credit refund applies."
        : "Full refund to your card (5–7 business days) applies."
      : hoursUntil > 2
        ? b.paidWithCredits
          ? "50% credit refund (0.5 credit) applies."
          : "No cash refund in this window. Credit bookings receive a partial credit refund."
        : "No refund — within 2 hours of start.";

  const cancelMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sessions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookingId: b.id,
          reason: cancelReason.trim() || undefined,
          cancelledBy: "client",
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        data?: { message?: string };
      };
      if (!res.ok || !j.success) {
        throw new Error(j.error ?? "Cancel failed");
      }
    },
    onSuccess: () => {
      setCancelOpen(false);
      setCancelReason("");
      setCancelErr(null);
      void qc.invalidateQueries({ queryKey: ["patient-sessions-list"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["patient-credits"] });
      void qc.invalidateQueries({ queryKey: ["credits-balance"] });
    },
    onError: (e: Error) => setCancelErr(e.message),
  });

  const slotsQ = useQuery({
    queryKey: ["reschedule-slots", b.therapist.id, selectedYmd],
    queryFn: async () => {
      const r = await fetch(
        `/api/booking/slots?therapistId=${encodeURIComponent(b.therapist.id)}&date=${encodeURIComponent(selectedYmd)}`,
        { credentials: "include" },
      );
      const j = (await r.json()) as { success?: boolean; data?: string[] };
      if (!r.ok || !j.success) throw new Error("Could not load times");
      return j.data ?? [];
    },
    enabled: rescheduleOpen && Boolean(selectedYmd),
  });

  const rescheduleMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sessions/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          bookingId: b.id,
          newDate: selectedYmd,
          newStartTime: selectedSlot,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Reschedule failed");
    },
    onSuccess: () => {
      setRescheduleOpen(false);
      setSelectedYmd("");
      setSelectedSlot("");
      setRescheduleErr(null);
      void qc.invalidateQueries({ queryKey: ["patient-sessions-list"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
    },
    onError: (e: Error) => setRescheduleErr(e.message),
  });

  const nextDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d.toISOString().slice(0, 10);
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
        <div className="flex flex-wrap gap-2">
          {canReschedule ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 gap-1.5"
              onClick={() => {
                setRescheduleErr(null);
                setRescheduleOpen(true);
              }}
            >
              <RefreshCw className="size-3.5" strokeWidth={1.5} />
              Reschedule
            </Button>
          ) : null}
          {b.rescheduleCount >= 2 ? (
            <span className="self-center text-xs text-muted-foreground">
              Max reschedules used
            </span>
          ) : null}
          {canCancel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10 gap-1.5 text-destructive hover:text-destructive"
              onClick={() => {
                setCancelErr(null);
                setCancelOpen(true);
              }}
            >
              <X className="size-3.5" strokeWidth={1.5} />
              Cancel
            </Button>
          ) : null}
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
        </div>

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Cancel this session?</DialogTitle>
            </DialogHeader>
            <p
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium",
                hoursUntil > 24
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-900",
              )}
            >
              {refundHint}
            </p>
            <label className="block text-xs font-medium text-muted-foreground">
              Reason (optional)
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </label>
            {cancelErr ? (
              <p className="text-xs text-destructive">{cancelErr}</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setCancelOpen(false)}
              >
                Keep session
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                disabled={cancelMut.isPending}
                onClick={() => cancelMut.mutate()}
              >
                {cancelMut.isPending ? "Cancelling…" : "Confirm cancel"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Reschedule session</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Remaining reschedules: {Math.max(0, 2 - b.rescheduleCount)}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {nextDates.map((ymd) => (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => {
                    setSelectedYmd(ymd);
                    setSelectedSlot("");
                  }}
                  className={cn(
                    "flex min-w-[52px] shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-xs font-medium",
                    selectedYmd === ymd
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  <span className="opacity-80">
                    {new Date(ymd + "T12:00:00").toLocaleDateString("en-NG", {
                      weekday: "short",
                    })}
                  </span>
                  <span className="font-bold">
                    {new Date(ymd + "T12:00:00").getDate()}
                  </span>
                </button>
              ))}
            </div>
            {selectedYmd ? (
              slotsQ.isPending ? (
                <p className="text-xs text-muted-foreground">Loading times…</p>
              ) : slotsQ.data?.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No times on this date.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slotsQ.data?.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium",
                        selectedSlot === slot
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )
            ) : null}
            {rescheduleErr ? (
              <p className="text-xs text-destructive">{rescheduleErr}</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setRescheduleOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={
                  !selectedYmd || !selectedSlot || rescheduleMut.isPending
                }
                onClick={() => rescheduleMut.mutate()}
              >
                {rescheduleMut.isPending ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
  const router = useRouter();
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
                <button
                  type="button"
                  onClick={() => router.push("/dashboard?view=book")}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "min-h-12 w-full max-w-sm",
                  )}
                >
                  Book a session
                </button>
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
