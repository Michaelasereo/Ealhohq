"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  slug: string;
};

export function BlogHelpful({ slug }: Props) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async (helpful: boolean) => {
    if (done || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ helpful }),
      });
      if (res.ok) setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-[#5c574e]">Was this helpful?</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={done || loading}
          onClick={() => void send(true)}
          className={cn(
            "inline-flex min-h-11 min-w-[48px] items-center justify-center rounded-full border border-primary/20 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5",
            done && "opacity-60",
          )}
          aria-label="Yes, helpful"
        >
          <ThumbsUp size={18} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          disabled={done || loading}
          onClick={() => void send(false)}
          className={cn(
            "inline-flex min-h-11 min-w-[48px] items-center justify-center rounded-full border border-primary/20 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5",
            done && "opacity-60",
          )}
          aria-label="Not helpful"
        >
          <ThumbsDown size={18} strokeWidth={1.5} />
        </button>
      </div>
      {done && (
        <p className="text-xs text-[#807a5a]">Thanks for your feedback.</p>
      )}
    </div>
  );
}
