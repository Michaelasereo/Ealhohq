"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

import { ChatThreadList, type ThreadListItem } from "@/components/chat/ChatThreadList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

async function fetchThreads(): Promise<ThreadListItem[]> {
  const r = await fetch("/api/chat/threads", { credentials: "include" });
  const j = (await r.json()) as {
    success?: boolean;
    data?: { threads: ThreadListItem[] };
  };
  if (!r.ok || !j.success || !j.data?.threads) return [];
  return j.data.threads;
}

function TherapistMessagesInner() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const threadsQ = useQuery({
    queryKey: ["chat-threads"],
    queryFn: fetchThreads,
  });

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    const t = searchParams.get("thread");
    if (t) setActiveId(t);
  }, [searchParams]);

  const threads = threadsQ.data ?? [];
  const active = threads.find((x) => x.id === activeId);

  if (threadsQ.isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-5xl flex-col md:flex-row md:border md:border-border md:rounded-xl md:overflow-hidden md:min-h-[560px]">
      <div
        className={cn(
          "flex min-h-0 w-full flex-col border-border md:w-80 md:border-r",
          activeId ? "hidden md:flex" : "flex max-h-[45vh] md:max-h-none",
        )}
      >
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
          "min-h-0 flex-1 flex-col bg-background",
          activeId ? "flex min-h-[55vh] md:min-h-0" : "hidden md:flex",
        )}
      >
        {activeId && active && userId ? (
          <ChatWindow
            threadId={activeId}
            otherPartyName={active.otherPartyName}
            otherPartyPhoto={active.otherPartyPhoto}
            currentUserRole="therapist"
            currentUserId={userId}
            onBack={() => setActiveId(null)}
            canSend={active.status !== "pending_deletion"}
            readOnlyHint="This client scheduled deletion of this chat. Messaging is paused until they cancel from their profile."
          />
        ) : (
          <div className="hidden h-full items-center justify-center p-6 text-sm text-muted-foreground md:flex">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}

export function TherapistMessagesClient() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading…</p>}>
      <TherapistMessagesInner />
    </Suspense>
  );
}
