"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { BookingStep1 } from "@/components/booking/BookingStep1";
import { BookingStep2 } from "@/components/booking/BookingStep2";
import {
  EMPTY_BOOKING,
  type BookingData,
} from "@/components/booking/BookingModal";
import { CaptureReferralFromUrl } from "@/components/referral/CaptureReferralFromUrl";
import { BookingStep3Patient } from "@/components/patient/BookingStep3Patient";
import { cn } from "@/lib/utils";

const STEP_LABELS = ["About you", "Choose therapist", "Date & time"] as const;

type Props = {
  onComplete: () => void;
  onCancel: () => void;
};

export default function PatientBookingFlow({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>(EMPTY_BOOKING);

  const updateData = useCallback((updates: Partial<BookingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/patient/profile/me", {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { fullName?: string; email?: string; phone?: string };
      };
      if (cancelled || !j.success || !j.data) return;
      updateData({
        fullName: j.data.fullName ?? "",
        email: j.data.email ?? "",
        phone: j.data.phone ?? "",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [updateData]);

  function handleComplete() {
    setStep(1);
    setData(EMPTY_BOOKING);
    onComplete();
  }

  function handleCancel() {
    setStep(1);
    setData(EMPTY_BOOKING);
    onCancel();
  }

  return (
    <div className="mx-auto max-w-lg pb-8 pt-2">
      <CaptureReferralFromUrl />
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={step === 1 ? handleCancel : () => setStep((s) => s - 1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 transition-colors hover:bg-gray-50"
          aria-label={step === 1 ? "Cancel booking" : "Previous step"}
        >
          <ArrowLeft size={16} strokeWidth={1.5} className="text-gray-600" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Step {step} of 3 · {STEP_LABELS[step - 1]}
          </p>
          <div className="mt-1.5 flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  s <= step ? "bg-primary" : "bg-gray-200",
                )}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="shrink-0 text-xs text-gray-400 transition-colors hover:text-gray-600"
        >
          Cancel
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        {step === 1 && (
          <BookingStep1
            data={data}
            onUpdate={updateData}
            onNext={() => setStep(2)}
            isLoggedIn
          />
        )}
        {step === 2 && (
          <BookingStep2
            data={data}
            onUpdate={updateData}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <BookingStep3Patient
            data={data}
            onUpdate={updateData}
            onBack={() => setStep(2)}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
