"use client";

import { LoadingWithCopy } from "@/components/shared/LoadingWithCopy";
import { Skeleton } from "@/components/ui/skeleton";
import { PARTNER_ADMIN_MESSAGES } from "@/lib/loading-messages";
import { cn } from "@/lib/utils";

const shellClass =
  "mx-auto w-full max-w-5xl px-4 py-6 md:px-6";

/** Full-page loading: same pattern as admin dashboard (rotating copy) + skeleton preview card. */
export function PartnerWorkspaceLoading({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[55vh] flex-col items-center justify-center gap-8",
        shellClass,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingWithCopy messages={[...PARTNER_ADMIN_MESSAGES]} size="lg" />
      <div
        className="w-full max-w-2xl space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
        aria-hidden
      >
        <Skeleton className="h-4 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 min-h-12 flex-1" />
          <Skeleton className="h-9 w-24 min-h-12" />
        </div>
      </div>
    </div>
  );
}

export function PartnerWorkspaceError({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div className={cn(shellClass, className)}>
      <p className="text-destructive">{message}</p>
    </div>
  );
}
