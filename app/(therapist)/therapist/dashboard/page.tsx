"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  DollarSign,
  Repeat2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { LoadingWithCopy } from "@/components/shared/LoadingWithCopy";
import { Skeleton } from "@/components/ui/skeleton";
import { THERAPIST_DASHBOARD_MESSAGES } from "@/lib/loading-messages";
import { AnonymousBadge } from "@/components/therapist/AnonymousBadge";
import {
  canJoinSessionWindow,
  minutesUntilSessionStart,
} from "@/lib/session/join-access";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { getDisplayName } from "@/lib/utils/patient-display";
import { cn } from "@/lib/utils";

type DashboardBooking = {
  id: string;
  guestName: string | null;
  isAnonymous: boolean;
  clientAlias: string | null;
  startTime: string;
  endTime: string;
  date: string;
  status: string;
  sessionType: string;
  patient: { fullName: string; email: string } | null;
  session: {
    id: string;
    status: string;
    notesGenerated: boolean;
    sessionNumber: number;
  } | null;
};

type DashboardPayload = {
  therapist: {
    id: string;
    status: string;
    sessionRate: number;
    sessionDuration: number;
    profilePhoto: string | null;
    therapistFirstName: string;
  };
  stats: {
    sessionsToday: number;
    sessionsThisWeek: number;
    totalClients: number;
    earningsThisMonth: number;
    pendingNotes: number;
  };
  todaySessions: DashboardBooking[];
  upcomingSessions: DashboardBooking[];
};

type PendingRebook = {
  id: string;
  patientName: string;
  suggestedDate: string;
  suggestedTime: string;
  dateTimeIso: string;
  sentHoursAgo: number;
  expiresInHours: number;
  createdAt: string;
};

async function fetchPendingRebooks(): Promise<PendingRebook[]> {
  const res = await fetch("/api/therapist/rebook/pending", {
    credentials: "include",
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: PendingRebook[];
    error?: string;
  };
  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.error ?? "Failed to load invitations");
  }
  return json.data;
}

async function fetchDashboardZone(
  zone: "stats" | "today" | "upcoming",
): Promise<DashboardPayload | Partial<DashboardPayload>> {
  const res = await fetch(`/api/therapist/dashboard?zone=${zone}`, {
    credentials: "include",
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: DashboardPayload | Partial<DashboardPayload>;
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? "Failed to load dashboard");
  }
  return json.data;
}

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

function TodaySessionCard({ b }: { b: DashboardBooking }) {
  const bookingDate = new Date(b.date);
  const startIso = bookingDateStartToIso(bookingDate, b.startTime);
  const timeShort = new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(startIso));
  const joinOk =
    b.status === "confirmed" &&
    canJoinSessionWindow(bookingDate, b.startTime, b.endTime);
  const minsUntil = minutesUntilSessionStart(bookingDate, b.startTime);
  const joinHref = `/session/join?bookingId=${b.id}`;
  const notesHref = b.session
    ? `/therapist/sessions/${b.session.id}/post-session`
    : null;
  const sessionNum = b.session?.sessionNumber ?? 1;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
        <div className="flex shrink-0 items-center justify-center rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold tabular-nums text-primary">
          {timeShort}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
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
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                b.sessionType === "intake"
                  ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {b.sessionType === "intake" ? "Intake" : "Follow-up"}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              Session {sessionNum}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {b.status === "confirmed" && joinOk ? (
            <Link
              href={joinHref}
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-12 w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto",
              )}
            >
              Join
            </Link>
          ) : null}
          {b.status === "confirmed" && !joinOk ? (
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                Scheduled
              </span>
              {minsUntil > 0 && minsUntil <= 60 ? (
                <span className="text-xs text-muted-foreground">
                  In {minsUntil} min
                </span>
              ) : null}
            </div>
          ) : null}
          {b.status === "completed" && b.session?.notesGenerated && notesHref ? (
            <Link
              href={notesHref}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "min-h-12 w-full sm:w-auto",
              )}
            >
              View notes
            </Link>
          ) : null}
          {b.status === "completed" && b.session && !b.session.notesGenerated ? (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
              Notes pending
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TherapistDashboardPage() {
  const queryClient = useQueryClient();
  const statsQ = useQuery({
    queryKey: ["therapist-dashboard", "stats"],
    queryFn: () => fetchDashboardZone("stats") as Promise<Pick<DashboardPayload, "therapist" | "stats">>,
  });
  const todayQ = useQuery({
    queryKey: ["therapist-dashboard", "today"],
    queryFn: () => fetchDashboardZone("today") as Promise<Pick<DashboardPayload, "todaySessions">>,
  });
  const upcomingQ = useQuery({
    queryKey: ["therapist-dashboard", "upcoming"],
    queryFn: () =>
      fetchDashboardZone("upcoming") as Promise<
        Pick<DashboardPayload, "upcomingSessions">
      >,
  });

  const {
    data: pendingRebooks = [],
    isLoading: pendingLoading,
    isError: pendingError,
  } = useQuery({
    queryKey: ["therapist-rebook-pending"],
    queryFn: fetchPendingRebooks,
    enabled: Boolean(statsQ.data),
  });

  const cancelInvitation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/therapist/rebook/${requestId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not cancel invitation");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["therapist-rebook-pending"],
      });
    },
  });

  const firstLoad =
    statsQ.isPending && statsQ.fetchStatus === "fetching" && !statsQ.data;

  if (firstLoad) {
    return (
      <main className="mx-auto flex min-h-[65vh] w-full max-w-4xl flex-col items-center justify-center p-4 pb-16">
        <LoadingWithCopy
          messages={[...THERAPIST_DASHBOARD_MESSAGES]}
          size="lg"
          showProgressBar
          estimatedSeconds={4}
        />
      </main>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p className="text-destructive">
          {statsQ.error instanceof Error
            ? statsQ.error.message
            : "Could not load dashboard"}
        </p>
      </main>
    );
  }

  const { stats, therapist } = statsQ.data;
  const todaySessions = todayQ.data?.todaySessions ?? [];
  const upcomingSessions = upcomingQ.data?.upcomingSessions ?? [];
  const first = therapist.therapistFirstName;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-8 p-4 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greetingWat()}, {first} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your practice overview for today.
          </p>
        </div>
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {therapist.profilePhoto ? (
            <Image
              src={therapist.profilePhoto}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
              unoptimized={
                therapist.profilePhoto.startsWith("http")
              }
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm font-medium text-muted-foreground">
              {first[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      </header>

      <section className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Repeat2 className="size-5 text-primary" strokeWidth={1.5} aria-hidden />
            <h2 className="text-lg font-semibold">Rebooking invitations</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Rebook invites are suggested session times waiting for client response.
            No extra messages for now.
          </p>
        </div>
        {pendingLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : pendingError ? (
          <p className="text-sm text-destructive">
            Could not load rebooking invitations.
          </p>
        ) : pendingRebooks.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No pending rebook invitations. Send one from a client profile or
              after a session.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {pendingRebooks.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{inv.patientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatWAT(inv.dateTimeIso)} WAT
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent {inv.sentHoursAgo === 0 ? "less than 1 hour" : `${inv.sentHoursAgo} hour${inv.sentHoursAgo === 1 ? "" : "s"}`}{" "}
                      ago · Expires in {inv.expiresInHours} hour
                      {inv.expiresInHours === 1 ? "" : "s"}
                    </p>
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      Awaiting client response
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 shrink-0 sm:self-center"
                    disabled={cancelInvitation.isPending}
                    onClick={() => cancelInvitation.mutate(inv.id)}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            ))}
          </ul>
        )}
      </section>

      {stats.pendingNotes > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--figma-bg-pill)] bg-[var(--ealho-cream)] p-4 dark:border-border dark:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-[var(--figma-text)] dark:text-foreground">
            You have {stats.pendingNotes} session note
            {stats.pendingNotes === 1 ? "" : "s"} ready to review
          </p>
          <Link
            href="/therapist/sessions"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "min-h-12 w-full justify-center sm:w-auto",
            )}
          >
            Review notes
          </Link>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-white dark:border-border dark:bg-card">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
              <Calendar className="size-5 text-blue-700 dark:text-blue-200" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Today&apos;s sessions
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {stats.sessionsToday}
              </p>
              <p className="text-xs text-muted-foreground">scheduled today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-white dark:border-border dark:bg-card">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/50">
              <TrendingUp className="size-5 text-emerald-700 dark:text-emerald-200" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                This week
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {stats.sessionsThisWeek}
              </p>
              <p className="text-xs text-muted-foreground">sessions this week</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-white dark:border-border dark:bg-card">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/50">
              <Users className="size-5 text-violet-700 dark:text-violet-200" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total clients
              </p>
              <p className="text-2xl font-bold tabular-nums">
                {stats.totalClients}
              </p>
              <p className="text-xs text-muted-foreground">active clients</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-white dark:border-border dark:bg-card">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/50">
              <DollarSign className="size-5 text-amber-800 dark:text-amber-200" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Earnings this month
              </p>
              <p className="text-2xl font-bold tabular-nums">
                ₦{stats.earningsThisMonth.toLocaleString("en-NG")}
              </p>
              <p className="text-xs text-muted-foreground">earned this month</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Today&apos;s sessions</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
            {todayQ.isPending ? "—" : todaySessions.length}
          </span>
        </div>
        {todayQ.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        ) : todayQ.isError ? (
          <p className="text-sm text-destructive">
            {todayQ.error instanceof Error
              ? todayQ.error.message
              : "Could not load today&apos;s sessions."}
          </p>
        ) : todaySessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Calendar className="size-12 text-gray-300" strokeWidth={1.5} />
              <p className="font-semibold">No sessions today</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Your schedule is clear. Enjoy your day!
              </p>
              <Link
                href="/therapist/availability"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-12",
                )}
              >
                View availability
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todaySessions.map((b) => (
              <TodaySessionCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Upcoming</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
            {upcomingQ.isPending ? "—" : upcomingSessions.length}
          </span>
        </div>
        {upcomingQ.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : upcomingQ.isError ? (
          <p className="text-sm text-destructive">
            {upcomingQ.error instanceof Error
              ? upcomingQ.error.message
              : "Could not load upcoming sessions."}
          </p>
        ) : upcomingSessions.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No upcoming sessions scheduled.
              </p>
              <p className="text-sm text-muted-foreground">
                Manage your availability to let clients book.
              </p>
              <Link
                href="/therapist/availability"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "inline-flex min-h-12 items-center justify-center",
                )}
              >
                Set availability
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {upcomingSessions.map((b) => {
              const iso = bookingDateStartToIso(new Date(b.date), b.startTime);
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm"
                >
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {getDisplayName({
                      isAnonymous: b.isAnonymous,
                      clientAlias: b.clientAlias,
                      guestName: b.guestName,
                      patient: b.patient,
                    })}
                    {b.isAnonymous ? <AnonymousBadge /> : null}
                  </span>
                  <span className="text-muted-foreground">
                    {formatWAT(iso)} WAT
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
