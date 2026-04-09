"use client";

import { BurnoutFreebieModal } from "@/components/burnout/BurnoutFreebieModal";
import { useBookingStore } from "@/stores/bookingStore";

export function BurnoutFreebieModalHost() {
  const open = useBookingStore((s) => s.burnoutFreebieModalOpen);
  const setOpen = useBookingStore((s) => s.setBurnoutFreebieModalOpen);
  return <BurnoutFreebieModal open={open} onClose={() => setOpen(false)} />;
}
