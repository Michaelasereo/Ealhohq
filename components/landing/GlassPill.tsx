import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Figma-style glass pill — matches hero eyebrow (e.g. Clinicians). */
export function GlassPill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[30px] border border-white px-3 py-1 shadow-[inset_0_4px_4px_rgba(0,0,0,0.25)] backdrop-blur-[2px] rotate-[-8.6deg] sm:px-3.5 sm:py-1.5",
        className,
      )}
      style={{ background: "var(--figma-glass)" }}
    >
      <span className="relative z-[1] text-[12px] font-normal leading-none tracking-[-0.02em] text-black sm:text-[16px]">
        {children}
      </span>
    </span>
  );
}
