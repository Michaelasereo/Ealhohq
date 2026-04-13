"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useBookingStore } from "@/stores/bookingStore";

/**
 * Sets booking modal step-1 behaviour from `?type=clinician` vs `?type=general` (non-clinician).
 */
export function CapturePartnerBookParams() {
  const searchParams = useSearchParams();
  const setHide = useBookingStore((s) => s.setHideOccupationInBookingModal);

  useEffect(() => {
    const t = searchParams.get("type")?.toLowerCase() ?? "";
    if (t === "general" || t === "non_clinician" || t === "non-clinician") {
      setHide(true);
    } else if (t === "clinician") {
      setHide(false);
    }
  }, [searchParams, setHide]);

  return null;
}
