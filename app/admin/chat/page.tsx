"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type OverviewData = {
  totalActiveThreads: number;
  totalMessagesToday: number;
  flaggedMessages: { high: number; medium: number; low: number };
  slaBreaches: number;
  avgResponseTimeHours: number;
  therapistResponseStats: {
    therapistId: string;
    therapistName: string;
    unansweredCount: number;
    totalMessagesThisWeek: number;
  }[];
};

type SlaBreach = {
  threadId: string;
  therapistId: string;
  patientFirstName: string;
  therapistName: string;
  lastPatientMessageAt: string;
  hoursWithoutReply: number;
  totalUnansweredMessages: number;
};

type FlaggedRow = {
  id: string;
  threadId: string;
  senderRole: string;
  createdAt: string;
  riskLevel: string | null;
  riskType: string | null;
  flagReason: string | null;
  flaggedAt: string | null;
  isResolved: boolean;
  resolvedAt: string | null;
  highRiskEscalatedAt: string | null;
  threadStatus: string;
  patientName: string;
  therapistName: string;
};

type ThreadRow = {
  id: string;
  status: string;
  updatedAt: string;
  patient: { id: string; displayName: string };
  therapist: { id: string; displayName: string };
  lastMessage: {
    id: string;
    senderRole: string;
    createdAt: string;
    isFlagged: boolean;
    riskLevel: string | null;
    isResolved: boolean;
  } | null;
  openFlagCount: number;
  slaTherapistRemindedAt: string | null;
  slaAdminNotifiedAt: string | null;
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

async function fetchSla(): Promise<{ breaches: SlaBreach[] }> {
  const res = await fetch("/api/admin/chat/sla?hours=24", {
    credentials: "include",
  });
  const j = (await res.json()) as {
    success?: boolean;
    data?: { breaches: SlaBreach[] };
    error?: string;
  };
  if (!res.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load SLA");
  }
  return j.data;
}

async function fetchFlagged(unresolvedOnly: boolean): Promise<FlaggedRow[]> {
  const q = unresolvedOnly ? "?unresolved=1" : "";
  const res = await fetch(`/api/admin/chat/flagged${q}`, {
    credentials: "include",
  });
  const j = (await res.json()) as {
    success?: boolean;
    data?: { messages: FlaggedRow[] };
    error?: string;
  };
  if (!res.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load flags");
  }
  return j.data.messages;
}

async function fetchThreads(therapistId: string | null): Promise<ThreadRow[]> {
  const sp = new URLSearchParams({ limit: "50" });
  if (therapistId) sp.set("therapistId", therapistId);
  const res = await fetch(`/api/admin/chat/threads?${sp}`, {
    credentials: "include",
  });
  const j = (await res.json()) as {
    success?: boolean;
    data?: { threads: ThreadRow[] };
    error?: string;
  };
  if (!res.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load threads");
  }
  return j.data.threads;
}

function AdminChatPageInner() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const therapistFilter = searchParams.get("therapistId");
  const urlTab = searchParams.get("tab");

  const [tab, setTab] = useState(() =>
    urlTab === "sla" || urlTab === "flags" || urlTab === "threads"
      ? urlTab
      : "overview",
  );

  useEffect(() => {
    const t = searchParams.get("tab");
    if (
      t === "sla" ||
      t === "flags" ||
      t === "threads" ||
      t === "overview"
    ) {
      setTab(t);
    }
  }, [searchParams]);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const overviewQ = useQuery({
    queryKey: ["admin-chat-overview"],
    queryFn: fetchOverview,
  });

  const slaQ = useQuery({
    queryKey: ["admin-chat-sla"],
    queryFn: fetchSla,
    enabled: tab === "sla" || tab === "overview",
  });

  const flaggedQ = useQuery({
    queryKey: ["admin-chat-flagged", true],
    queryFn: () => fetchFlagged(true),
    enabled: tab === "flags",
  });

  const threadsQ = useQuery({
    queryKey: ["admin-chat-threads", therapistFilter],
    queryFn: () => fetchThreads(therapistFilter),
    enabled: tab === "threads",
  });

  const resolveMut = useMutation({
    mutationFn: async ({
      messageId,
      note,
    }: {
      messageId: string;
      note: string;
    }) => {
      const res = await fetch(
        `/api/admin/chat/flagged/${messageId}/resolve`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolutionNote: note.trim() || undefined,
          }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Resolve failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chat-flagged"] });
      qc.invalidateQueries({ queryKey: ["admin-chat-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-chat-threads"] });
      setResolveId(null);
      setResolveNote("");
    },
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-6 p-4 pb-24">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Chat monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Metadata only — encrypted message content is never shown to admins.
        </p>
        <div className="flex flex-wrap gap-2 pt-2 text-sm">
          <Link
            href="/admin/chat/therapists"
            className="text-primary underline-offset-4 hover:underline"
          >
            Therapist activity
          </Link>
          {therapistFilter ? (
            <Link
              href="/admin/chat"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Clear therapist filter
            </Link>
          ) : null}
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap gap-1">
          <TabsTrigger value="overview" className="min-h-11 flex-1">
            Overview
          </TabsTrigger>
          <TabsTrigger value="sla" className="min-h-11 flex-1">
            SLA (24h)
          </TabsTrigger>
          <TabsTrigger value="flags" className="min-h-11 flex-1">
            Open flags
          </TabsTrigger>
          <TabsTrigger value="threads" className="min-h-11 flex-1">
            Threads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {overviewQ.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : overviewQ.isError ? (
            <p className="text-destructive">
              {overviewQ.error instanceof Error
                ? overviewQ.error.message
                : "Error"}
            </p>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Active threads</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {overviewQ.data!.totalActiveThreads}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Messages today (WAT)</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {overviewQ.data!.totalMessagesToday}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card
                  className={cn(
                    overviewQ.data!.slaBreaches > 0 &&
                      "border-amber-400/80 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/25",
                  )}
                >
                  <CardHeader className="pb-2">
                    <CardDescription>SLA breaches (24h+ no reply)</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {overviewQ.data!.slaBreaches}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      Avg therapist reply (7d, hours)
                    </CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {overviewQ.data!.avgResponseTimeHours.toFixed(1)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </section>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Flagged messages</CardTitle>
                  <CardDescription>
                    Open (unresolved) flags by severity from risk scanning.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 text-sm">
                  <span>
                    High:{" "}
                    <strong className="tabular-nums text-destructive">
                      {overviewQ.data!.flaggedMessages.high}
                    </strong>
                  </span>
                  <span>
                    Medium:{" "}
                    <strong className="tabular-nums">
                      {overviewQ.data!.flaggedMessages.medium}
                    </strong>
                  </span>
                  <span>
                    Low:{" "}
                    <strong className="tabular-nums">
                      {overviewQ.data!.flaggedMessages.low}
                    </strong>
                  </span>
                </CardContent>
              </Card>
              {slaQ.data && slaQ.data.breaches.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      SLA queue preview
                    </CardTitle>
                    <CardDescription>
                      Latest patient message unanswered ≥24h. Open SLA tab for
                      full list.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {slaQ.data.breaches.slice(0, 5).map((b) => (
                      <div
                        key={b.threadId}
                        className="flex flex-col gap-0.5 rounded-md border border-border/80 p-3"
                      >
                        <span className="font-medium">
                          {b.therapistName} → {b.patientFirstName}
                        </span>
                        <span className="text-muted-foreground">
                          {b.hoursWithoutReply}h since last patient message ·{" "}
                          {b.totalUnansweredMessages} queued
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="sla" className="mt-4">
          {slaQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : slaQ.isError ? (
            <p className="text-destructive">
              {slaQ.error instanceof Error ? slaQ.error.message : "Error"}
            </p>
          ) : slaQ.data!.breaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No SLA breaches right now.
            </p>
          ) : (
            <ul className="space-y-3">
              {slaQ.data!.breaches.map((b) => (
                <li key={b.threadId}>
                  <Card>
                    <CardContent className="space-y-1 p-4 text-sm">
                      <p className="font-medium">
                        {b.therapistName} · patient {b.patientFirstName}
                      </p>
                      <p className="text-muted-foreground">
                        Thread {b.threadId.slice(0, 8)}… ·{" "}
                        {b.hoursWithoutReply}h without reply ·{" "}
                        {new Date(b.lastPatientMessageAt).toLocaleString(
                          "en-NG",
                          { dateStyle: "medium", timeStyle: "short" },
                        )}{" "}
                        WAT
                      </p>
                      <Link
                        href={`/admin/chat?therapistId=${encodeURIComponent(b.therapistId)}&tab=threads`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "mt-2 inline-flex min-h-10 items-center",
                        )}
                      >
                        Open threads (filtered)
                      </Link>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="flags" className="mt-4 space-y-4">
          {flaggedQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : flaggedQ.isError ? (
            <p className="text-destructive">
              {flaggedQ.error instanceof Error
                ? flaggedQ.error.message
                : "Error"}
            </p>
          ) : flaggedQ.data!.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No unresolved flagged messages.
            </p>
          ) : (
            <ul className="space-y-4">
              {flaggedQ.data!.map((m) => (
                <li key={m.id}>
                  <Card>
                    <CardContent className="space-y-3 p-4 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {m.riskLevel?.toUpperCase() ?? "FLAG"} risk
                            {m.riskType ? ` · ${m.riskType}` : ""}
                          </p>
                          <p className="text-muted-foreground">
                            {m.therapistName} / {m.patientName} ·{" "}
                            {m.senderRole} · Thread {m.threadId.slice(0, 8)}…
                          </p>
                          {m.flagReason ? (
                            <p className="mt-1 text-muted-foreground">
                              Reason: {m.flagReason}
                            </p>
                          ) : null}
                          {m.highRiskEscalatedAt ? (
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                              Clinical lead notified (escalation sent).
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-11 shrink-0"
                          onClick={() => {
                            setResolveId(m.id);
                            setResolveNote("");
                          }}
                        >
                          Mark reviewed
                        </Button>
                      </div>
                      {resolveId === m.id ? (
                        <div className="space-y-2 rounded-lg border p-3">
                          <Label htmlFor={`note-${m.id}`}>
                            Note (optional, internal)
                          </Label>
                          <Input
                            id={`note-${m.id}`}
                            value={resolveNote}
                            onChange={(e) => setResolveNote(e.target.value)}
                            placeholder="e.g. Reviewed with therapist"
                            className="min-h-10"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              className="min-h-11"
                              disabled={resolveMut.isPending}
                              onClick={() =>
                                resolveMut.mutate({
                                  messageId: m.id,
                                  note: resolveNote,
                                })
                              }
                            >
                              {resolveMut.isPending ? "Saving…" : "Confirm"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="min-h-11"
                              disabled={resolveMut.isPending}
                              onClick={() => {
                                setResolveId(null);
                                setResolveNote("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="threads" className="mt-4">
          {therapistFilter ? (
            <p className="mb-3 text-sm text-muted-foreground">
              Filtered to therapist ID{" "}
              <code className="text-xs">{therapistFilter}</code>. Use the SLA tab
              or therapist activity page to jump here with a filter.
            </p>
          ) : null}
          {threadsQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : threadsQ.isError ? (
            <p className="text-destructive">
              {threadsQ.error instanceof Error
                ? threadsQ.error.message
                : "Error"}
            </p>
          ) : threadsQ.data!.length === 0 ? (
            <p className="text-sm text-muted-foreground">No threads found.</p>
          ) : (
            <ul className="space-y-3">
              {threadsQ.data!.map((t) => (
                <li key={t.id}>
                  <Card>
                    <CardContent className="space-y-1 p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium capitalize">{t.status}</span>
                        {t.openFlagCount > 0 ? (
                          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                            {t.openFlagCount} open flag
                            {t.openFlagCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                      <p>
                        {t.therapist.displayName} ↔ {t.patient.displayName}
                      </p>
                      <p className="text-muted-foreground">
                        Updated{" "}
                        {new Date(t.updatedAt).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      {t.lastMessage ? (
                        <p className="text-muted-foreground">
                          Last: {t.lastMessage.senderRole} ·{" "}
                          {new Date(t.lastMessage.createdAt).toLocaleString(
                            "en-NG",
                            { timeStyle: "short" },
                          )}
                          {t.lastMessage.isFlagged && !t.lastMessage.isResolved
                            ? " · flagged"
                            : ""}
                        </p>
                      ) : (
                        <p className="text-muted-foreground">No messages yet.</p>
                      )}
                      {(t.slaTherapistRemindedAt || t.slaAdminNotifiedAt) && (
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          SLA: therapist reminded
                          {t.slaTherapistRemindedAt ? " ✓" : ""}
                          {t.slaAdminNotifiedAt ? " · admin notified ✓" : ""}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

    </main>
  );
}

export default function AdminChatPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl p-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="mt-4 h-64 w-full" />
        </main>
      }
    >
      <AdminChatPageInner />
    </Suspense>
  );
}
