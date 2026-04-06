"use client";

import Image from "next/image";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { LoadingWithCopy } from "@/components/shared/LoadingWithCopy";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_MESSAGES } from "@/lib/loading-messages";
import { canJoinSessionTenMinutesBefore } from "@/lib/patient/join-eligibility";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";

type DashboardBooking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  therapist: { id: string; name: string; photo: string };
  session: {
    id: string;
    sessionNumber: number;
    feedbackSubmitted: boolean;
  } | null;
};

type DashboardData = {
  profile: { fullName: string };
  firstName: string;
  upcomingSession: DashboardBooking | null;
  recentSessions: DashboardBooking[];
  credits: { balance: number; tier: string };
  totalSessions: number;
};

function greetingWat(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone: "Africa/Lagos",
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function countdownLabel(dateIso: string): string {
  const ms = new Date(dateIso).getTime() - Date.now();
  if (ms <= 0) return "Starting soon";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `In ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `In ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `In ${days} day${days === 1 ? "" : "s"}`;
}

function longDateWAT(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function timeAmPmWAT(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function buildIcs(opts: {
  title: string;
  startIso: string;
  endIso: string;
  uid: string;
}): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = fmt(new Date(opts.startIso));
  const end = fmt(new Date(opts.endIso));
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ealho Therapy//EN",
    "BEGIN:VEVENT",
    `UID:${opts.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${opts.title.replace(/,/g, "\\,")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const TIER_RING: Record<string, string> = {
  bronze: "border-amber-200 bg-amber-50 text-amber-900",
  silver: "border-slate-200 bg-slate-100 text-slate-800",
  gold: "border-yellow-200 bg-yellow-50 text-yellow-900",
  platinum: "border-violet-200 bg-violet-50 text-violet-900",
};

type StatsZone = {
  firstName: string;
  totalSessions: number;
  credits: { balance: number; tier: string };
};

type NextZone = { upcomingSession: DashboardData["upcomingSession"] };

type RecentZone = { recentSessions: DashboardData["recentSessions"] };

async function fetchStatsZone(): Promise<StatsZone> {
  const r = await fetch("/api/patient/dashboard?zone=stats", {
    credentials: "include",
  });
  const j = (await r.json()) as {
    success?: boolean;
    data?: StatsZone;
    error?: string;
  };
  if (!r.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load");
  }
  return j.data;
}

async function fetchNextZone(): Promise<NextZone> {
  const r = await fetch("/api/patient/dashboard?zone=next", {
    credentials: "include",
  });
  const j = (await r.json()) as {
    success?: boolean;
    data?: NextZone;
    error?: string;
  };
  if (!r.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load");
  }
  return j.data;
}

async function fetchRecentZone(): Promise<RecentZone> {
  const r = await fetch("/api/patient/dashboard?zone=recent", {
    credentials: "include",
  });
  const j = (await r.json()) as {
    success?: boolean;
    data?: RecentZone;
    error?: string;
  };
  if (!r.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load");
  }
  return j.data;
}

export interface PatientDashboardHomeProps {
  onBookSession: () => void;
}

export function PatientDashboardHome({ onBookSession }: PatientDashboardHomeProps) {
  const statsQ = useQuery({
    queryKey: ["patient-dashboard", "stats"],
    queryFn: fetchStatsZone,
  });
  const nextQ = useQuery({
    queryKey: ["patient-dashboard", "next"],
    queryFn: fetchNextZone,
  });
  const recentQ = useQuery({
    queryKey: ["patient-dashboard", "recent"],
    queryFn: fetchRecentZone,
  });

  const firstPaint =
    statsQ.isPending && statsQ.fetchStatus === "fetching" && !statsQ.data;

  if (firstPaint) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center p-4 pb-24 md:pb-8">
        <LoadingWithCopy
          messages={[...DASHBOARD_MESSAGES]}
          size="lg"
          showProgressBar
          estimatedSeconds={4}
        />
      </main>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <main className="mx-auto max-w-lg p-4">
        <p className="text-destructive">
          {statsQ.error instanceof Error
            ? statsQ.error.message
            : "Error"}
        </p>
      </main>
    );
  }

  const data = statsQ.data;
  const up = nextQ.data?.upcomingSession ?? null;
  const startIso = up
    ? bookingDateStartToIso(new Date(up.date), up.startTime)
    : null;
  const endIso = up
    ? bookingDateStartToIso(new Date(up.date), up.endTime)
    : null;
  const bookingDate = up ? new Date(up.date) : null;
  const joinOk =
    up &&
    bookingDate &&
    canJoinSessionTenMinutesBefore(bookingDate, up.startTime);

  return (
    <main className="mx-auto w-full max-w-lg space-y-8 p-4 pb-24 md:pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greetingWat()}, {data.firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back to your wellness journey.
        </p>
      </header>

      {nextQ.isPending ? (
        <Skeleton className="h-56 w-full rounded-2xl" />
      ) : nextQ.isError ? (
        <p className="text-sm text-destructive">
          {nextQ.error instanceof Error
            ? nextQ.error.message
            : "Could not load next session."}
        </p>
      ) : up && startIso ? (
        <Card className="overflow-hidden border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10">
          <CardContent className="space-y-4 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Your next session
            </p>
            <div className="flex items-start gap-3">
              <Image
                src={up.therapist.photo}
                alt=""
                width={56}
                height={56}
                className="size-14 shrink-0 rounded-full object-cover"
                unoptimized={up.therapist.photo.startsWith("http")}
              />
              <div className="min-w-0">
                <p className="font-semibold">{up.therapist.name}</p>
                <p className="text-sm text-muted-foreground">
                  {longDateWAT(startIso)}
                </p>
                <p className="text-sm font-medium">
                  {timeAmPmWAT(startIso)} WAT
                </p>
                <span className="mt-2 inline-block rounded-full bg-background/90 px-2 py-0.5 text-xs dark:bg-background/20">
                  {up.sessionType === "intake" ? "Intake" : "Follow-up"} ·{" "}
                  {up.session?.sessionNumber ? `Session ${up.session.sessionNumber}` : "Scheduled"}
                </span>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">
              {countdownLabel(startIso)}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {joinOk ? (
                <Link
                  href={`/session/join?bookingId=${up.id}`}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "min-h-12 w-full",
                  )}
                >
                  Join session
                </Link>
              ) : (
                <Button
                  type="button"
                  disabled
                  variant="default"
                  className="min-h-12 w-full opacity-60"
                >
                  Join session
                </Button>
              )}
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-12 w-full border-primary/25",
                )}
                onClick={() => {
                  if (!endIso) return;
                  downloadIcs(
                    buildIcs({
                      title: `Therapy — ${up.therapist.name}`,
                      startIso,
                      endIso,
                      uid: `ealho-booking-${up.id}@ealhohq.com`,
                    }),
                    "ealho-session.ics",
                  );
                }}
              >
                Add to calendar
              </button>
            </div>
            {!joinOk ? (
              <p className="text-center text-xs text-muted-foreground">
                Join opens 10 minutes before start (WAT).
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <Calendar className="size-14 text-primary/25" strokeWidth={1.5} />
            <p className="font-semibold">No upcoming sessions</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Ready when you are. Book a session with one of our therapists.
            </p>
            <button
              type="button"
              onClick={onBookSession}
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-12 w-full max-w-sm",
              )}
            >
              Book a session
            </button>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total sessions</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.totalSessions}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Credits remaining</p>
            <p className="text-2xl font-bold tabular-nums">
              {data.credits.balance}
            </p>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border-2",
            TIER_RING[data.credits.tier] ?? TIER_RING.bronze,
          )}
        >
          <CardContent className="p-4">
            <p className="text-xs opacity-80">Current tier</p>
            <p className="text-xl font-bold capitalize">{data.credits.tier}</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent sessions</h2>
        {recentQ.isPending ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed p-6">
            <LoadingWithCopy
              messages={["Fetching your sessions...", "Almost there..."]}
              size="md"
            />
          </div>
        ) : recentQ.isError ? (
          <p className="text-sm text-destructive">
            {recentQ.error instanceof Error
              ? recentQ.error.message
              : "Could not load sessions."}
          </p>
        ) : (recentQ.data?.recentSessions.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your session history will appear here.
          </p>
        ) : (
          <ul className="space-y-3">
            {(recentQ.data?.recentSessions ?? []).map((s) => {
              const iso = bookingDateStartToIso(new Date(s.date), s.startTime);
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
                >
                  <Image
                    src={s.therapist.photo}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-full object-cover"
                    unoptimized={s.therapist.photo.startsWith("http")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{s.therapist.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatWAT(iso)} WAT · Session{" "}
                      {s.session?.sessionNumber ?? "—"}
                    </p>
                  </div>
                  {s.session && !s.session.feedbackSubmitted ? (
                    <Link
                      href={`/sessions/${s.session.id}/feedback`}
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "min-h-10 text-xs",
                      )}
                    >
                      Leave feedback
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={onBookSession}
            className={cn(
              buttonVariants({ variant: "default" }),
              "min-h-12 w-full justify-center",
            )}
          >
            Book session
          </button>
          <Link
            href="/history"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-12 w-full justify-center",
            )}
          >
            View history
          </Link>
          <Link
            href="/credits"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-12 w-full justify-center",
            )}
          >
            Buy credits
          </Link>
        </div>
      </section>
    </main>
  );
}
