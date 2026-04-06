"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { captureReferralCode } from "@/lib/referral/client";

/**
 * Mount on public pages; persists ?ref=CODE to localStorage for 30 days.
 */
export function CaptureReferralFromUrl() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref?.trim()) captureReferralCode(ref);
  }, [searchParams]);

  return null;
}
