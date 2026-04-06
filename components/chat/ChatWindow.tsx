"use client";

import Image from "next/image";
import { ArrowUp, ChevronLeft, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useChat, type ChatMessageRow } from "@/hooks/useChat";
import { therapistPublicLabel } from "@/lib/therapist-display-name";
import { cn } from "@/lib/utils";

type Props = {
  threadId: string;
  otherPartyName: string;
  otherPartyPhoto: string;
  currentUserRole: "patient" | "therapist";
  currentUserId: string;
  onBack?: () => void;
  /** When false, composer is hidden (e.g. chat deletion scheduled). */
  canSend?: boolean;
  readOnlyHint?: string;
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ds = startOf(d);
  const ns = startOf(now);
  if (ds === ns) return "Today";
  if (ds === ns - 86400000) return "Yesterday";
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(d);
}

function groupByDay(messages: ChatMessageRow[]) {
  const groups: { label: string; items: ChatMessageRow[] }[] = [];
  let last = "";
  for (const m of messages) {
    const label = dayLabel(m.createdAt);
    if (label !== last) {
      groups.push({ label, items: [m] });
      last = label;
    } else {
      groups[groups.length - 1]!.items.push(m);
    }
  }
  return groups;
}

export function ChatWindow({
  threadId,
  otherPartyName,
  otherPartyPhoto,
  currentUserRole,
  currentUserId,
  onBack,
  canSend = true,
  readOnlyHint,
}: Props) {
  const { messages, setMessages, sendMessage, loadMessages } = useChat(threadId);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { messages: rows, nextCursor } = await loadMessages();
      if (cancelled) return;
      setOlderCursor(nextCursor);
      setMessages(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, loadMessages, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const placeholder =
    currentUserRole === "patient"
      ? `Message ${therapistPublicLabel(otherPartyName)}…`
      : `Message ${otherPartyName.split(/\s+/)[0] ?? "client"}…`;

  async function handleSend() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText("");
    try {
      await sendMessage(t);
    } catch (err) {
      setText(t);
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  async function loadMore() {
    if (!olderCursor) return;
    const el = scrollRef.current;
    const prevH = el?.scrollHeight ?? 0;
    const { nextCursor } = await loadMessages(olderCursor);
    setOlderCursor(nextCursor);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevH;
    });
  }

  const groups = groupByDay(messages);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 md:hidden"
            onClick={onBack}
            aria-label="Back"
          >
            <ChevronLeft className="size-5" />
          </Button>
        ) : null}
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border">
          <Image
            src={otherPartyPhoto}
            alt=""
            width={40}
            height={40}
            className="size-10 object-cover"
            unoptimized={otherPartyPhoto.startsWith("http")}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{otherPartyName}</p>
          <p className="text-xs text-muted-foreground">
            Encrypted conversation
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      >
        {olderCursor ? (
          <Button
            type="button"
            variant="ghost"
            className="mb-3 w-full min-h-10 text-sm"
            onClick={() => void loadMore()}
          >
            Load older messages
          </Button>
        ) : null}
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
            <Lock className="mb-3 size-10 opacity-40" />
            <p className="font-medium text-foreground">Your messages are encrypted</p>
            <p className="mt-1 max-w-xs">
              Only you and {otherPartyName} can read them. Say hello to get started.
            </p>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mb-4">
              <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
                {g.label}
              </p>
              <div className="space-y-2">
                {g.items.map((m) => {
                  const mine = m.senderId === currentUserId;
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", mine ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px] opacity-80",
                            mine ? "text-right" : "text-left",
                          )}
                        >
                          {new Intl.DateTimeFormat("en-NG", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                            timeZone: "Africa/Lagos",
                          }).format(new Date(m.createdAt))}
                          {mine ? (m.isRead ? " · Read" : " · Sent") : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        <p className="mb-1 text-center text-[10px] text-muted-foreground">
          This conversation is encrypted
        </p>
        {!canSend ? (
          <p className="rounded-lg bg-muted px-3 py-3 text-center text-sm text-muted-foreground">
            {readOnlyHint ??
              "You can’t send messages in this conversation right now."}
          </p>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 2000))}
                placeholder={placeholder}
                rows={1}
                className="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <Button
                type="button"
                size="icon"
                className="size-11 shrink-0 bg-primary text-primary-foreground"
                disabled={!text.trim() || sending}
                onClick={() => void handleSend()}
                aria-label="Send"
              >
                <ArrowUp className="size-5" />
              </Button>
            </div>
            {text.length > 1800 ? (
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {text.length}/2000
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
