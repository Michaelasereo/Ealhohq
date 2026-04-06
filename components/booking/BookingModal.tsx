"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { BookingStep1 } from "@/components/booking/BookingStep1";
import { BookingStep2 } from "@/components/booking/BookingStep2";
import { BookingStep3 } from "@/components/booking/BookingStep3";
import { CaptureReferralFromUrl } from "@/components/referral/CaptureReferralFromUrl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface BookingData {
  reason: string;
  reasonCategory: string;
  professionalType: string;
  fullName: string;
  email: string;
  phone: string;
  isAnonymous: boolean;
  alias: string;
  therapistId: string;
  therapistName: string;
  therapistPhoto: string | null;
  therapistRate: number;
  therapistDuration: number;
  isAutoMatched: boolean;
  date: string;
  startTime: string;
  bookingId: string;
}

export const EMPTY_BOOKING: BookingData = {
  reason: "",
  reasonCategory: "",
  professionalType: "",
  fullName: "",
  email: "",
  phone: "",
  isAnonymous: false,
  alias: "",
  therapistId: "",
  therapistName: "",
  therapistPhoto: null,
  therapistRate: 0,
  therapistDuration: 50,
  isAutoMatched: false,
  date: "",
  startTime: "",
  bookingId: "",
};

const STEP_LABELS = ["About you", "Your therapist", "Date & time"] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BookingModal({ open, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>(EMPTY_BOOKING);

  function updateData(updates: Partial<BookingData>) {
    setData((prev) => ({ ...prev, ...updates }));
  }

  function handleClose() {
    setStep(1);
    setData(EMPTY_BOOKING);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(100vw-2rem,32rem)] max-h-[min(92vh,800px)] overflow-hidden border-0 p-0 shadow-2xl sm:max-w-lg sm:rounded-2xl max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[92vh] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl"
      >
        <CaptureReferralFromUrl />
        <div className="border-b border-gray-100 px-6 pb-4 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Step {step} of 3
              </p>
              <p className="mt-0.5 text-base font-semibold text-gray-900">
                {STEP_LABELS[step - 1]}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
              aria-label="Close"
            >
              <X size={14} strokeWidth={2} className="text-gray-600" />
            </button>
          </div>
          <div className="flex gap-1.5">
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

        <div className="max-h-[70vh] overflow-y-auto max-sm:max-h-[75vh]">
          {step === 1 && (
            <BookingStep1 data={data} onUpdate={updateData} onNext={() => setStep(2)} />
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
            <BookingStep3
              data={data}
              onUpdate={updateData}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
