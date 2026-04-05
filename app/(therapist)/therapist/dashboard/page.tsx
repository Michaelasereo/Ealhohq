"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  DollarSign,
  Mail,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

async function fetchDashboard(): Promise<DashboardPayload> {
  const res = await fetch("/api/therapist/dashboard", {
    credentials: "include",
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: DashboardPayload;
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
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["therapist-dashboard"],
    queryFn: fetchDashboard,
  });

  const {
    data: pendingRebooks = [],
    isLoading: pendingLoading,
    isError: pendingError,
  } = useQuery({
    queryKey: ["therapist-rebook-pending"],
    queryFn: fetchPendingRebooks,
    enabled: !isLoading && Boolean(data),
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

  if (isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 p-4 pb-16">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-24 w-2/3" />
          <Skeleton className="size-10 shrink-0 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Could not load dashboard"}
        </p>
      </main>
    );
  }

  const { stats, todaySessions, upcomingSessions } = data;
  const first = data.therapist.therapistFirstName;

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-8 p-4 pb-20">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greetingWat()}, Dr. {first} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your practice overview for today.
          </p>
        </div>
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
          {data.therapist.profilePhoto ? (
            <Image
              src={data.therapist.profilePhoto}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
              unoptimized={
                data.therapist.profilePhoto.startsWith("http")
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
        <div className="flex items-center gap-2">
          <Mail className="size-5 text-primary" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold">Pending invitations</h2>
        </div>
        {pendingLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : pendingError ? (
          <p className="text-sm text-destructive">
            Could not load session invitations.
          </p>
        ) : pendingRebooks.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No pending session invitations. Send one from a client profile or
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
                      Awaiting patient response
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
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
            You have {stats.pendingNotes} session note
            {stats.pendingNotes === 1 ? "" : "s"} ready to review
          </p>
          <Link
            href="/therapist/sessions"
            className={cn(
              buttonVariants({ variant: "default" }),
              "min-h-12 w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto",
            )}
          >
            Review notes
          </Link>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-100 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/30">
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
        <Card className="border-emerald-100 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30">
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
        <Card className="border-violet-100 bg-violet-50/80 dark:border-violet-900 dark:bg-violet-950/30">
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
        <Card className="border-amber-100 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
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
            {todaySessions.length}
          </span>
        </div>
        {todaySessions.length === 0 ? (
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
            {upcomingSessions.length}
          </span>
        </div>
        {upcomingSessions.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No upcoming sessions scheduled.
              </p>
              <p className="text-sm text-muted-foreground">
                Manage your availability to let patients book.
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
