"use client";

import { PaymentSuccessModal } from "@/components/booking/PaymentSuccessModal";

export function BookSuccessOverlay() {
  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 bg-[#FAF8F5]" aria-hidden />
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
        <PaymentSuccessModal />
      </div>
    </div>
  );
}
