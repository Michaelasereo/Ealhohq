"use client";

import { useBookingStore } from "@/stores/bookingStore";

export function FooterBookSessionTrigger({ className }: { className?: string }) {
  const setOpen = useBookingStore((s) => s.setBookingModalOpen);
  return (
    <button type="button" onClick={() => setOpen(true)} className={className}>
      Book a Session
    </button>
  );
}
