"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Check, Clock, Shield } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { BookingData } from "@/components/booking/BookingModal";
import { formatSlotTo12h, formatWatLongDate } from "@/lib/booking/display-wat";

function buildGuestBookingReason(reason: string, category: string): string | undefined {
  const r = reason.trim();
  const c = category.trim();
  if (!r && !c) return undefined;
  if (c && r) return `[${c}] ${r}`.slice(0, 500);
  if (c) return `[${c}]`.slice(0, 500);
  return r.slice(0, 500);
}

function nextFourteenDaysYmd(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
}

function formatDateLabel(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00+01:00`);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  if (dateStr === todayStr) return "Today";
  if (dateStr === tomorrowStr) return "Tomorrow";

  return formatWatLongDate(dateStr).split(",")[0] ?? dateStr;
}

type Props = {
  data: BookingData;
  onUpdate: (updates: Partial<BookingData>) => void;
  onBack: () => void;
};

export function BookingStep3({ data, onUpdate, onBack }: Props) {
  const [selectedDate, setSelectedDate] = useState(data.date);
  const [selectedSlot, setSelectedSlot] = useState(data.startTime);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [aiConsentAccepted, setAiConsentAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableDates = nextFourteenDaysYmd();

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots", data.therapistId, selectedDate],
    queryFn: async (): Promise<string[]> => {
      const r = await fetch(
        `/api/booking/slots?therapistId=${encodeURIComponent(data.therapistId)}&date=${encodeURIComponent(selectedDate)}`,
      );
      const j = (await r.json()) as { success?: boolean; data?: string[] };
      if (!r.ok || !j.success || !j.data) return [];
      return j.data;
    },
    enabled: Boolean(selectedDate && data.therapistId),
  });

  async function handleProceedToPayment() {
    if (!selectedDate || !selectedSlot) return;
    if (!termsAccepted || !aiConsentAccepted) return;

    setIsSubmitting(true);
    setError("");

    const guestName = data.isAnonymous ? data.alias.trim() : data.fullName.trim();
    const guestBookingReason = buildGuestBookingReason(data.reason, data.reasonCategory);

    try {
      const createRes = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: data.therapistId,
          date: selectedDate,
          startTime: selectedSlot,
          sessionType: "followup",
          consentConfirmed: true,
          consentTimestamp: new Date().toISOString(),
          isAnonymous: data.isAnonymous,
          guestName,
          guestEmail: data.email.trim(),
          guestPhone: data.phone.trim(),
          guestBookingReason,
        }),
      });
      const createJson = (await createRes.json()) as {
        success?: boolean;
        data?: { bookingId?: string };
        error?: string;
      };
      if (!createRes.ok || !createJson.success || !createJson.data?.bookingId) {
        throw new Error(createJson.error ?? "Could not create booking");
      }
      const bookingId = createJson.data.bookingId;
      onUpdate({ bookingId, date: selectedDate, startTime: selectedSlot });

      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          consentTypes: ["terms", "privacy", "ai_notes"],
        }),
      });

      const initRes = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          email: data.email.trim(),
          metadata: {
            booking_reason: guestBookingReason ?? "",
          },
        }),
      });
      const initJson = (await initRes.json()) as {
        success?: boolean;
        data?: { authorization_url?: string };
        error?: string;
      };
      if (!initRes.ok || !initJson.success || !initJson.data?.authorization_url) {
        throw new Error(initJson.error ?? "Could not start payment");
      }

      window.location.href = initJson.data.authorization_url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  const canProceed = Boolean(
    selectedDate && selectedSlot && termsAccepted && aiConsentAccepted,
  );

  const displayName = data.isAnonymous ? data.alias : data.fullName;
  const photo = data.therapistPhoto;
  const initial = data.therapistName?.[0] ?? "T";

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-primary/10">
          {photo ? (
            <Image
              src={photo}
              alt=""
              width={40}
              height={40}
              className="size-full object-cover"
              sizes="40px"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="text-sm font-bold text-primary/60">{initial}</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{data.therapistName}</p>
          <p className="text-xs text-gray-500">
            {data.therapistDuration} min session · ₦{data.therapistRate.toLocaleString()}
          </p>
        </div>
        {data.isAutoMatched ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            ✨ Matched
          </span>
        ) : null}
      </div>

      <div>
        <label className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900">
          <Calendar size={15} strokeWidth={1.5} className="text-primary" />
          Select a date
        </label>
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
          {availableDates.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => {
                setSelectedDate(date);
                setSelectedSlot("");
                onUpdate({ date, startTime: "" });
              }}
              className={`flex min-w-[64px] flex-shrink-0 flex-col items-center rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                selectedDate === date
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <span className="mb-0.5 text-[10px] opacity-70">
                {new Date(`${date}T12:00:00+01:00`).toLocaleDateString("en-NG", {
                  weekday: "short",
                })}
              </span>
              <span className="font-bold">{new Date(`${date}T12:00:00+01:00`).getDate()}</span>
              <span className="text-[10px] opacity-70">
                {new Date(`${date}T12:00:00+01:00`).toLocaleDateString("en-NG", { month: "short" })}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedDate ? (
        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900">
            <Clock size={15} strokeWidth={1.5} className="text-primary" />
            Select a time
            <span className="ml-1 text-xs font-normal text-gray-400">(WAT)</span>
          </label>

          {slotsLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-20 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : !slotsData?.length ? (
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">No slots available on this date.</p>
              <p className="mt-1 text-xs text-gray-400">Try a different date.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slotsData.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    onUpdate({ startTime: slot });
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    selectedSlot === slot
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {formatSlotTo12h(slot)} WAT
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {selectedSlot ? (
        <div className="space-y-2 rounded-xl bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Summary</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Session</span>
            <span className="font-medium text-gray-900">{data.therapistDuration} minutes</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Date</span>
            <span className="text-right font-medium text-gray-900">
              {formatDateLabel(selectedDate)} at {formatSlotTo12h(selectedSlot)} WAT
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Therapist</span>
            <span className="text-right font-medium text-gray-900">
              {displayName} with {data.therapistName}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-sm font-bold text-gray-900">
              ₦{data.therapistRate.toLocaleString()}
            </span>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3">
          <button
            type="button"
            onClick={() => setTermsAccepted(!termsAccepted)}
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              termsAccepted ? "border-primary bg-primary" : "border-gray-300"
            }`}
            aria-pressed={termsAccepted}
          >
            {termsAccepted ? (
              <Check size={11} strokeWidth={3} className="text-primary-foreground" />
            ) : null}
          </button>
          <span className="text-xs leading-relaxed text-gray-600">
            I have read and agree to the{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Terms of Service
            </a>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <button
            type="button"
            onClick={() => setAiConsentAccepted(!aiConsentAccepted)}
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              aiConsentAccepted ? "border-primary bg-primary" : "border-gray-300"
            }`}
            aria-pressed={aiConsentAccepted}
          >
            {aiConsentAccepted ? (
              <Check size={11} strokeWidth={3} className="text-primary-foreground" />
            ) : null}
          </button>
          <span className="text-xs leading-relaxed text-gray-600">
            I consent to AI-assisted note generation. Audio is processed and permanently deleted.
            Notes are visible to my therapist only.
          </span>
        </label>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Shield size={12} strokeWidth={1.5} />
        <span>Secured by Paystack · NDPA compliant · Encrypted end-to-end</span>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-500">{error}</p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back
        </button>
        <button
          type="button"
          onClick={handleProceedToPayment}
          disabled={!canProceed || isSubmitting}
          className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting
            ? "Processing..."
            : `Pay ₦${data.therapistRate.toLocaleString()} →`}
        </button>
      </div>
    </div>
  );
}
