"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ChatConsentModal } from "@/components/chat/ChatConsentModal";
import { ChatThreadList, type ThreadListItem } from "@/components/chat/ChatThreadList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { buttonVariants } from "@/components/ui/button";
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

export function PatientMessagesTab({
  initialThreadId,
  fullPage,
}: Props) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const consentQ = useQuery({
    queryKey: ["chat-consent"],
    queryFn: fetchConsent,
  });

  const threadsQ = useQuery({
    queryKey: ["chat-threads"],
    queryFn: fetchThreads,
    enabled: consentQ.data === true,
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
            "flex min-h-0 w-full bg-background",
            fullPage ? "min-h-[calc(100dvh-4rem)]" : "h-[calc(100dvh-8rem)] max-h-[560px]",
            "md:h-[520px]",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 w-full flex-col border-border md:w-80 md:border-r",
              activeId ? "hidden md:flex" : "flex",
            )}
          >
            {fullPage ? (
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Link
                  href="/dashboard?tab=home"
                  className={cn(buttonVariants({ variant: "ghost" }), "min-h-10 px-2")}
                >
                  ← Home
                </Link>
                <span className="text-sm font-medium">Messages</span>
              </div>
            ) : null}
            <ChatThreadList
              threads={threads}
              activeId={activeId}
              onSelect={(id) => {
                setActiveId(id);
                void qc.invalidateQueries({ queryKey: ["chat-threads"] });
              }}
            />
          </div>
          <div
            className={cn(
              "min-h-0 flex-1 flex-col",
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
    </>
  );
}
