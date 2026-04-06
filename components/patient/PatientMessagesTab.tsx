"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ChatConsentModal } from "@/components/chat/ChatConsentModal";
import { ChatThreadList, type ThreadListItem } from "@/components/chat/ChatThreadList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  initialThreadId?: string | null;
  fullPage?: boolean;
};

async function fetchConsent(): Promise<boolean> {
  const r = await fetch("/api/chat/consent", { credentials: "include" });
  const j = (await r.json()) as {
    success?: boolean;
    data?: { hasConsent: boolean };
  };
  if (!r.ok || !j.success) return false;
  return Boolean(j.data?.hasConsent);
}

async function fetchThreads(): Promise<ThreadListItem[]> {
  const r = await fetch("/api/chat/threads", { credentials: "include" });
  const j = (await r.json()) as {
    success?: boolean;
    data?: { threads: ThreadListItem[] };
  };
  if (!r.ok || !j.success || !j.data?.threads) return [];
  return j.data.threads;
}

type EligibleTherapist = { id: string; name: string; photo: string };

async function fetchMessagingTherapists(): Promise<EligibleTherapist[]> {
  const r = await fetch("/api/patient/messaging/therapists", {
    credentials: "include",
  });
  const j = (await r.json()) as {
    success?: boolean;
    data?: { therapists: EligibleTherapist[] };
  };
  if (!r.ok || !j.success || !j.data?.therapists) return [];
  return j.data.therapists;
}

export function PatientMessagesTab({
  initialThreadId,
  fullPage,
}: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startSheetOpen, setStartSheetOpen] = useState(false);

  const consentQ = useQuery({
    queryKey: ["chat-consent"],
    queryFn: fetchConsent,
  });

  const threadsQ = useQuery({
    queryKey: ["chat-threads"],
    queryFn: fetchThreads,
    enabled: consentQ.data === true,
  });

  const eligibleQ = useQuery({
    queryKey: ["patient-messaging-therapists"],
    queryFn: fetchMessagingTherapists,
    enabled: consentQ.data === true,
  });

  const startThreadMut = useMutation({
    mutationFn: async (therapistId: string) => {
      const r = await fetch("/api/chat/threads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapistId }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { threadId: string };
        error?: string;
        needsConsent?: boolean;
      };
      if (!r.ok || !j.success || !j.data?.threadId) {
        throw new Error(j.error ?? "Could not open conversation");
      }
      return j.data.threadId;
    },
    onSuccess: (threadId) => {
      setStartSheetOpen(false);
      void qc.invalidateQueries({ queryKey: ["chat-threads"] });
      setActiveId(threadId);
      if (fullPage) {
        router.replace(`/messages?thread=${threadId}`);
      }
    },
  });

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (initialThreadId) setActiveId(initialThreadId);
  }, [initialThreadId]);

  function onConsentDone() {
    void qc.invalidateQueries({ queryKey: ["chat-consent"] });
    void qc.invalidateQueries({ queryKey: ["chat-threads"] });
  }

  const threads = threadsQ.data ?? [];
  const active = threads.find((t) => t.id === activeId);

  if (consentQ.isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading…</div>
    );
  }

  return (
    <>
      <ChatConsentModal
        open={consentQ.isSuccess && consentQ.data === false}
        onComplete={onConsentDone}
      />

      {consentQ.data === true ? (
        <div
          className={cn(
            "flex min-h-0 w-full flex-col bg-background md:flex-row md:overflow-hidden",
            fullPage &&
              "md:min-h-[560px] md:rounded-xl md:border md:border-border",
            fullPage
              ? "min-h-[calc(100dvh-8.5rem)]"
              : "h-[calc(100dvh-8rem)] max-h-[560px]",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 w-full flex-col border-border md:w-80 md:max-w-[320px] md:shrink-0 md:border-r",
              activeId ? "hidden md:flex" : "flex",
            )}
          >
            {fullPage ? (
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Link
                  href="/dashboard"
                  className={cn(buttonVariants({ variant: "ghost" }), "min-h-10 px-2")}
                >
                  ← Home
                </Link>
                <span className="text-sm font-medium">Messages</span>
              </div>
            ) : null}
            <div className="shrink-0 border-b border-border p-3">
              <Button
                type="button"
                className="min-h-12 w-full bg-primary text-primary-foreground"
                onClick={() => setStartSheetOpen(true)}
              >
                Start a conversation
              </Button>
            </div>
            <ChatThreadList
              threads={threads}
              activeId={activeId}
              emptyHint="Tap “Start a conversation” to message a therapist you’ve booked with, or wait for them to message you."
              onSelect={(id) => {
                setActiveId(id);
                void qc.invalidateQueries({ queryKey: ["chat-threads"] });
              }}
            />
          </div>
          <div
            className={cn(
              "min-h-0 flex-1 flex-col bg-background md:min-w-0",
              activeId ? "flex" : "hidden md:flex",
            )}
          >
            {activeId && active && userId ? (
              <ChatWindow
                threadId={activeId}
                otherPartyName={active.otherPartyName}
                otherPartyPhoto={active.otherPartyPhoto}
                currentUserRole="patient"
                currentUserId={userId}
                onBack={() => setActiveId(null)}
                canSend={active.status !== "pending_deletion"}
                readOnlyHint="You scheduled deletion of your chats. Open Dashboard → Profile → Messaging to cancel if you want to send messages again."
              />
            ) : (
              <div className="hidden h-full items-center justify-center p-6 text-sm text-muted-foreground md:flex">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      ) : consentQ.data === false ? (
        <p className="p-4 text-sm text-muted-foreground">
          Accept the prompts above to enable secure messaging with your therapist.
        </p>
      ) : null}

      <Sheet open={startSheetOpen} onOpenChange={setStartSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>Message a therapist</SheetTitle>
            <SheetDescription>
              You can chat with therapists you have a confirmed or completed booking
              with — same rule as when they message you first.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2 px-4 pb-8">
            {eligibleQ.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : eligibleQ.data?.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                <p>No eligible therapists yet.</p>
                <p className="mt-2">
                  Book a session first, then you can start a conversation here.
                </p>
                <Link
                  href="/dashboard/book"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "mt-4 inline-flex min-h-12 w-full justify-center",
                  )}
                >
                  Book a session
                </Link>
              </div>
            ) : (
              (eligibleQ.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={startThreadMut.isPending}
                  onClick={() => startThreadMut.mutate(t.id)}
                  className="flex w-full min-h-14 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-60"
                >
                  <Image
                    src={t.photo}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-full object-cover"
                    unoptimized={t.photo.startsWith("http")}
                  />
                  <span className="min-w-0 flex-1 font-medium text-foreground">
                    {t.name}
                  </span>
                  {startThreadMut.isPending ? (
                    <span className="text-xs text-muted-foreground">Opening…</span>
                  ) : (
                    <span className="text-xs font-medium text-primary">Open</span>
                  )}
                </button>
              ))
            )}
            {startThreadMut.isError ? (
              <p className="text-sm text-destructive">
                {startThreadMut.error instanceof Error
                  ? startThreadMut.error.message
                  : "Something went wrong"}
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
