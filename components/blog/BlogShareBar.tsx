"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  title: string;
};

export function BlogShareBar({ slug, title }: Props) {
  const [copied, setCopied] = useState(false);
  const url = `${getSiteUrl()}/blog/${slug}`;
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  const share = (href: string) => () => {
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-y border-[#dddbd0] py-4",
        "lg:sticky lg:top-24 lg:z-10 lg:flex-col lg:items-start lg:border-y-0 lg:py-0",
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-[#807a5a]">
        Share
      </span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share(
            `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
          )}
          className="min-h-11 rounded-full border border-primary/20 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          X
        </button>
        <button
          type="button"
          onClick={share(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
          )}
          className="min-h-11 rounded-full border border-primary/20 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          LinkedIn
        </button>
        <button
          type="button"
          onClick={share(`https://wa.me/?text=${text}%20${encoded}`)}
          className="min-h-11 rounded-full border border-primary/20 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/20 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          {copied ? (
            <Check size={16} strokeWidth={1.5} aria-hidden />
          ) : (
            <Link2 size={16} strokeWidth={1.5} aria-hidden />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
