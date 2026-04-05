"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type OverviewData = {
  therapistResponseStats: {
    therapistId: string;
    therapistName: string;
    unansweredCount: number;
    totalMessagesThisWeek: number;
  }[];
  slaBreaches: number;
  avgResponseTimeHours: number;
};

async function fetchOverview(): Promise<OverviewData> {
  const res = await fetch("/api/admin/chat/overview", {
    credentials: "include",
  });
  const j = (await res.json()) as {
    success?: boolean;
    data?: OverviewData;
    error?: string;
  };
  if (!res.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load overview");
  }
  return j.data;
}

export default function AdminChatTherapistsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-chat-overview"],
    queryFn: fetchOverview,
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 p-4 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Therapist chat activity</h1>
        <p className="text-sm text-muted-foreground">
          Weekly message volume and current SLA breach counts by therapist. No
          message content.
        </p>
        <Link
          href="/admin/chat"
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Back to chat monitoring
        </Link>
      </header>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Error"}
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Platform SLA breaches (24h+)</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {data!.slaBreaches}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg reply time (7d, hours)</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {data!.avgResponseTimeHours.toFixed(1)}
                </CardTitle>
              </CardHeader>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By therapist</CardTitle>
              <CardDescription>
                Therapists with activity this week or an open SLA breach.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data!.therapistResponseStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No therapist chat activity in the last 7 days.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {data!.therapistResponseStats.map((row) => (
                    <li
                      key={row.therapistId}
                      className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{row.therapistName}</p>
                        <p className="text-muted-foreground">
                          Therapist messages (7d):{" "}
                          <span className="tabular-nums">
                            {row.totalMessagesThisWeek}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {row.unansweredCount > 0 ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-900 dark:text-amber-200">
                            {row.unansweredCount} SLA breach
                            {row.unansweredCount === 1 ? "" : "es"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No open SLA
                          </span>
                        )}
                        <Link
                          href={`/admin/chat?therapistId=${encodeURIComponent(row.therapistId)}&tab=threads`}
                          className="min-h-10 inline-flex items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
                        >
                          Threads
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
