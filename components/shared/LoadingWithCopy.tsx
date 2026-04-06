"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export interface LoadingWithCopyProps {
  messages: string[];
  intervalMs?: number;
  showSpinner?: boolean;
  showProgressBar?: boolean;
  estimatedSeconds?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeText: Record<NonNullable<LoadingWithCopyProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

const sizeSpinner: Record<NonNullable<LoadingWithCopyProps["size"]>, string> = {
  sm: "size-6",
  md: "size-9",
  lg: "size-12",
};

export function LoadingWithCopy({
  messages,
  intervalMs = 1800,
  showSpinner = true,
  showProgressBar = false,
  estimatedSeconds = 8,
  size = "md",
  className,
}: LoadingWithCopyProps) {
  const safeMessages = useMemo(
    () => (messages.length > 0 ? messages : ["Loading…"]),
    [messages],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (safeMessages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % safeMessages.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [safeMessages.length, intervalMs]);

  return (
    <div
      className={cn("flex flex-col items-center gap-4 text-center", className)}
      role="status"
      aria-live="polite"
    >
      {showSpinner ? (
        <div
          className={cn(
            "rounded-full bg-primary/15",
            sizeSpinner[size],
            "animate-[ealho-pulse-ring_1.8s_ease-in-out_infinite]",
          )}
          aria-hidden
        />
      ) : null}
      <div className="relative min-h-[2.5em] w-full max-w-md">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={safeMessages[index]}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={cn(
              "text-pretty font-medium text-foreground",
              sizeText[size],
            )}
          >
            {safeMessages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      {showProgressBar ? (
        <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "92%" }}
            transition={{
              duration: Math.max(1, estimatedSeconds),
              ease: "linear",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
