"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export interface TopProgressBarProps {
  isLoading: boolean;
  estimatedMs?: number;
}

export function TopProgressBar({
  isLoading,
  estimatedMs = 3000,
}: TopProgressBarProps) {
  const [mount, setMount] = useState(false);
  const [phase, setPhase] = useState<"idle" | "load" | "finish">("idle");

  useEffect(() => {
    if (isLoading) {
      setMount(true);
      setPhase("load");
      return;
    }
    if (phase === "load") {
      setPhase("finish");
    }
  }, [isLoading, phase]);

  useEffect(() => {
    if (phase !== "finish") return;
    const t = window.setTimeout(() => {
      setMount(false);
      setPhase("idle");
    }, 380);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <AnimatePresence>
      {mount ? (
        <motion.div
          key="top-progress"
          className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          aria-hidden
        >
          <motion.div
            className="h-full rounded-none bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: phase === "load" ? "85%" : "100%" }}
            transition={{
              width: {
                duration: phase === "load" ? estimatedMs / 1000 : 0.22,
                ease: phase === "load" ? "linear" : "easeOut",
              },
            }}
            style={{
              boxShadow: "2px 0 14px 3px rgba(26, 122, 74, 0.5)",
            }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
