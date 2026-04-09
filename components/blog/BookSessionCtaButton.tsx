"use client";

import { figmaPrimaryCta } from "@/lib/ealho-link-styles";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

export function BookSessionCtaButton({ className }: { className?: string }) {
  const setOpen = useBookingStore((s) => s.setBookingModalOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        figmaPrimaryCta,
        "inline-flex min-h-11 items-center justify-center px-6",
        className,
      )}
    >
      Book a Session →
    </button>
  );
}
