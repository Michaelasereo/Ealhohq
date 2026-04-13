"use client";

import { Suspense } from "react";

import { BookingModal } from "@/components/booking/BookingModal";
import { CapturePartnerBookParams } from "@/components/referral/CapturePartnerBookParams";
import { useBookingStore } from "@/stores/bookingStore";

export function BookingModalHost() {
  const open = useBookingStore((s) => s.bookingModalOpen);
  const setOpen = useBookingStore((s) => s.setBookingModalOpen);
  return (
    <>
      <Suspense fallback={null}>
        <CapturePartnerBookParams />
      </Suspense>
      <BookingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
