"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

export function SectionReveal({
  id,
  className,
  delay = 0,
  children,
}: {
  id?: string;
  className?: string;
  delay?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });

  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function Pill({ children, dark }: { children: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex min-h-9 items-center rounded-full border px-4 py-1.5 text-xs font-semibold tracking-[0.16em] ${
        dark
          ? "border-white/30 bg-white/5 text-[#FAF8F5]"
          : "border-[#292612]/30 bg-[#292612]/6 text-[#292612]"
      }`}
    >
      {children}
    </span>
  );
}

export function scrollToId(id: string) {
  if (typeof window === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
