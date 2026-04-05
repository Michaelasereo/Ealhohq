"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type ChatMessageRow = {
  id: string;
  content: string;
  senderId: string;
  senderRole: string;
  createdAt: string;
  isRead: boolean;
};

export function useChat(threadId: string | null) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setMessages([]);
  }, [threadId]);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `threadId=eq.${threadId}`,
        },
        async (payload) => {
          const newId = (payload.new as { id?: string })?.id;
          if (!newId) return;
          try {
            const response = await fetch(
              `/api/chat/threads/${threadId}/messages?after=${encodeURIComponent(newId)}&limit=10`,
              { credentials: "include" },
            );
            const json = (await response.json()) as {
              success?: boolean;
              data?: { messages?: ChatMessageRow[] };
            };
            if (!response.ok || !json.success || !json.data?.messages?.length) {
              return;
            }
            setMessages((prev) => {
              const existing = new Set(prev.map((m) => m.id));
              const incoming = json.data!.messages!.filter((m) => !existing.has(m.id));
              if (incoming.length === 0) return prev;
              return [...prev, ...incoming].sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
              );
            });
          } catch {
            /* ignore */
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsConnected(true);
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    return () => {
      setIsConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [threadId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!threadId) return null;
      const response = await fetch(`/api/chat/threads/${threadId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await response.json()) as {
        success?: boolean;
        data?: { message?: ChatMessageRow };
        error?: string;
      };
      if (!response.ok || !json.success || !json.data?.message) {
        throw new Error(json.error ?? "Send failed");
      }
      const msg = json.data.message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
      return json.data.message;
    },
    [threadId],
  );

  const loadMessages = useCallback(
    async (before?: string) => {
      if (!threadId) return { messages: [] as ChatMessageRow[], nextCursor: null as string | null };
      const url = before
        ? `/api/chat/threads/${threadId}/messages?before=${encodeURIComponent(before)}&limit=50`
        : `/api/chat/threads/${threadId}/messages?limit=50`;
      const response = await fetch(url, { credentials: "include" });
      const json = (await response.json()) as {
        success?: boolean;
        data?: { messages: ChatMessageRow[]; nextCursor: string | null };
      };
      if (!response.ok || !json.success || !json.data) {
        return { messages: [], nextCursor: null };
      }
      const { messages: rows, nextCursor } = json.data;
      const sorted = [...rows].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages((prev) => {
        if (!before) return sorted;
        const map = new Map<string, ChatMessageRow>();
        for (const m of sorted) map.set(m.id, m);
        for (const m of prev) map.set(m.id, m);
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
      return { messages: sorted, nextCursor };
    },
    [threadId],
  );

  return { messages, setMessages, isConnected, sendMessage, loadMessages };
}
