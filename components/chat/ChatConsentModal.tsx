"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onComplete: () => void;
};

export function ChatConsentModal({ open, onComplete }: Props) {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [c, setC] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/chat/consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformProcessing: true,
          safetyScanning: true,
          safetyOverride: true,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not save");
    },
    onSuccess: () => {
      setErr(null);
      onComplete();
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (!open) return null;

  const all = a && b && c;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-consent-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-background p-4 shadow-lg sm:rounded-2xl sm:p-6">
        <h2 id="chat-consent-title" className="text-lg font-semibold">
          Before you start messaging
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ealho uses secure encrypted messaging to connect you with your therapist
          between sessions.
        </p>

        <div className="mt-4 space-y-4 text-sm">
          <label className="flex gap-3 leading-snug">
            <input
              type="checkbox"
              checked={a}
              onChange={(e) => setA(e.target.checked)}
              className="mt-1 size-4 shrink-0"
            />
            <span>
              <span className="font-medium">Platform data processing (required)</span>
              <br />
              I consent to Ealho storing my messages for the purpose of delivering
              therapy services. Messages are encrypted and only accessible to me and
              my treating therapist. Ealho staff cannot read my message content.
            </span>
          </label>
          <label className="flex gap-3 leading-snug">
            <input
              type="checkbox"
              checked={b}
              onChange={(e) => setB(e.target.checked)}
              className="mt-1 size-4 shrink-0"
            />
            <span>
              <span className="font-medium">Automated safety monitoring (required)</span>
              <br />
              I consent to automated scanning of my messages for safety risk
              indicators. This is done by AI only. No human at Ealho reads my
              messages unless I am at risk of serious harm.
            </span>
          </label>
          <label className="flex gap-3 leading-snug">
            <input
              type="checkbox"
              checked={c}
              onChange={(e) => setC(e.target.checked)}
              className="mt-1 size-4 shrink-0"
            />
            <span>
              <span className="font-medium">Safety override (required)</span>
              <br />
              I understand that if I express risk of serious harm to myself or others,
              my therapist has a professional duty to take action which may involve
              sharing relevant information with appropriate parties. This is for my
              safety.
            </span>
          </label>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          <a href="/privacy" className="text-primary underline">
            Privacy policy
          </a>
          . You can withdraw consent from profile settings when available.
        </p>

        {err ? <p className="mt-2 text-sm text-destructive">{err}</p> : null}

        <Button
          type="button"
          className="mt-6 min-h-12 w-full bg-primary text-primary-foreground"
          disabled={!all || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? "Saving…" : "Start messaging"}
        </Button>
      </div>
    </div>
  );
}
