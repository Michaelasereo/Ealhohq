"use client";

import { BookingModal } from "@/components/booking/BookingModal";
import { useBookingStore } from "@/stores/bookingStore";

export function BookingModalHost() {
  const open = useBookingStore((s) => s.bookingModalOpen);
  const setOpen = useBookingStore((s) => s.setBookingModalOpen);
  return <BookingModal open={open} onClose={() => setOpen(false)} />;
}
