"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MessagingStatus = {
  graceDays: number;
  pendingDeletion: boolean;
  scheduledDeletionAt: string | null;
  activeThreadCount: number;
};

async function fetchMessagingStatus(): Promise<MessagingStatus> {
  const r = await fetch("/api/chat/messaging-status", {
    credentials: "include",
  });
  const j = (await r.json()) as {
    success?: boolean;
    data?: MessagingStatus;
    error?: string;
  };
  if (!r.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load messaging settings");
  }
  return j.data;
}

export function PatientMessagingPrivacyCard() {
  const qc = useQueryClient();
  const [confirmSchedule, setConfirmSchedule] = useState(false);

  const statusQ = useQuery({
    queryKey: ["chat-messaging-status"],
    queryFn: fetchMessagingStatus,
  });

  const scheduleMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/chat/delete-all-messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "schedule" }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        data?: { scheduledDeletionAt?: string };
      };
      if (!r.ok) throw new Error(j.error ?? "Could not schedule deletion");
      return j.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chat-messaging-status"] });
      void qc.invalidateQueries({ queryKey: ["chat-threads"] });
      setConfirmSchedule(false);
    },
  });

  const cancelMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/chat/delete-all-messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not cancel");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chat-messaging-status"] });
      void qc.invalidateQueries({ queryKey: ["chat-threads"] });
    },
  });

  if (statusQ.isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }
  if (statusQ.isError || !statusQ.data) {
    return (
      <p className="text-sm text-destructive">
        {statusQ.error instanceof Error
          ? statusQ.error.message
          : "Could not load messaging settings"}
      </p>
    );
  }

  const s = statusQ.data;
  const scheduledLabel =
    s.scheduledDeletionAt &&
    new Intl.DateTimeFormat("en-NG", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(s.scheduledDeletionAt));

  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Messaging and privacy</CardTitle>
        <CardDescription>
          Encrypted chats with your therapists. You can schedule removal of all
          message content after a {s.graceDays}-day waiting period (email and
          WhatsApp confirmation).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {s.pendingDeletion && scheduledLabel ? (
          <div className="rounded-lg border border-amber-300/80 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="font-medium text-amber-950 dark:text-amber-100">
              Deletion scheduled
            </p>
            <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
              All therapy chats will be permanently scrubbed on{" "}
              <strong>{scheduledLabel}</strong> WAT. You can still read
              messages until then; sending is paused.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 min-h-11 w-full"
              disabled={cancelMut.isPending}
              onClick={() => void cancelMut.mutate()}
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel deletion"}
            </Button>
            {cancelMut.isError ? (
              <p className="mt-2 text-xs text-destructive">
                {cancelMut.error instanceof Error
                  ? cancelMut.error.message
                  : "Error"}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">
              Active conversations:{" "}
              <span className="font-medium text-foreground">
                {s.activeThreadCount}
              </span>
            </p>
            {!confirmSchedule ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                disabled={s.activeThreadCount === 0}
                onClick={() => setConfirmSchedule(true)}
              >
                Delete all my chat messages…
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p>
                  This schedules permanent removal of encrypted message content
                  in every therapy chat after {s.graceDays} days. You will get
                  email and WhatsApp reminders. You can cancel anytime before
                  the date from this screen.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-11 w-full"
                    disabled={scheduleMut.isPending}
                    onClick={() => void scheduleMut.mutate()}
                  >
                    {scheduleMut.isPending ? "Scheduling…" : "Confirm schedule"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full"
                    disabled={scheduleMut.isPending}
                    onClick={() => setConfirmSchedule(false)}
                  >
                    Back
                  </Button>
                </div>
                {scheduleMut.isError ? (
                  <p className="text-xs text-destructive">
                    {scheduleMut.error instanceof Error
                      ? scheduleMut.error.message
                      : "Error"}
                  </p>
                ) : null}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
