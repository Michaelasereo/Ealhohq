"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ThreadListItem = {
  id: string;
  status: string;
  otherPartyName: string;
  otherPartyPhoto: string;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
};

type Props = {
  threads: ThreadListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

export function ChatThreadList({ threads, activeId, onSelect }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return threads;
    return threads.filter((x) => x.otherPartyName.toLowerCase().includes(t));
  }, [threads, q]);

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-sm text-muted-foreground">
        <p>No messages yet</p>
        <p className="mt-2 max-w-xs">
          When your therapist reaches out or you open a conversation from a booking,
          threads will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border p-3">
        <Input
          placeholder="Search by name…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-11"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {filtered.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border px-3 py-3 text-left transition-colors",
                t.unreadCount > 0 && "bg-primary/5",
                activeId === t.id && "border-l-4 border-l-primary bg-primary/5 pl-2",
              )}
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                <Image
                  src={t.otherPartyPhoto}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 object-cover"
                  unoptimized={t.otherPartyPhoto.startsWith("http")}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{t.otherPartyName}</p>
                  {t.lastMessageAt ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(t.lastMessageAt).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {t.lastMessagePreview || "No messages yet"}
                </p>
                {t.status === "pending_deletion" ? (
                  <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                    Deletion scheduled — read-only
                  </p>
                ) : null}
              </div>
              {t.unreadCount > 0 ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {t.unreadCount > 9 ? "9+" : t.unreadCount}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
