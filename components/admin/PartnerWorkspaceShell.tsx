"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const shellClass =
  "mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-6";

/**
 * Layout wrapper for `/admin/partners/*`.
 * Client component so partner pages can compose Lucide-backed empty states without RSC
 * serialization issues. Outer `<main>` comes from `DashboardLayout` — this stays a `<div>`.
 */
export function PartnerWorkspaceShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(shellClass, className)}>{children}</div>;
}
