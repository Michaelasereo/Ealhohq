"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  CreditCard,
  Shield,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type { BookingData } from "@/components/booking/BookingModal";
import { createClient } from "@/lib/supabase/client";
import { formatSlotTo12h, formatWatLongDate } from "@/lib/booking/display-wat";
import { clearReferralCode, getReferralCode } from "@/lib/referral/client";

function buildGuestBookingReason(
  reason: string,
  category: string,
): string | undefined {
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

type PaymentMethod = "credits" | "card";

type Props = {
  data: BookingData;
  onUpdate: (updates: Partial<BookingData>) => void;
  onBack: () => void;
  onComplete: () => void;
};

export function BookingStep3Patient({ data, onUpdate, onBack, onComplete }: Props) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(data.date);
  const [selectedSlot, setSelectedSlot] = useState(data.startTime);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [aiConsentAccepted, setAiConsentAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<{
    discountAmount: number;
    finalAmount: number;
    isFree: boolean;
    discountType: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationSeconds, setValidationSeconds] = useState(0);
  const validationTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  /** null = auto (credits first when balance > 0) */
  const [paymentChoice, setPaymentChoice] = useState<PaymentMethod | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(
    null,
  );

  const { data: creditsData } = useQuery({
    queryKey: ["patient-credits"],
    queryFn: async () => {
      const r = await fetch("/api/patient/credits", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { balance: number };
      };
      if (!r.ok || !j.success) return { balance: 0 };
      return j.data ?? { balance: 0 };
    },
  });

  const creditBalance = creditsData?.balance ?? 0;

  const freeByDiscount = Boolean(discountResult?.isFree);
  const partialDiscount = Boolean(discountResult && !discountResult.isFree);

  const paymentMethod: PaymentMethod = useMemo(() => {
    if (partialDiscount || freeByDiscount) return "card";
    if (paymentChoice !== null) return paymentChoice;
    return creditBalance > 0 ? "credits" : "card";
  }, [paymentChoice, creditBalance, partialDiscount, freeByDiscount]);

  useEffect(() => {
    if (isValidating) {
      setValidationSeconds(0);
      validationTimerRef.current = setInterval(() => {
        setValidationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (validationTimerRef.current != null) {
        clearInterval(validationTimerRef.current);
        validationTimerRef.current = null;
      }
      setValidationSeconds(0);
    }
    return () => {
      if (validationTimerRef.current != null) {
        clearInterval(validationTimerRef.current);
        validationTimerRef.current = null;
      }
    };
  }, [isValidating]);

  async function handleApplyCode() {
    const c = discountCode.trim();
    if (!c) return;
    setIsValidating(true);
    setDiscountError("");
    try {
      const r = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, amount: data.therapistRate }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: {
          discountAmount: number;
          finalAmount: number;
          isFree: boolean;
          discountType: string;
        };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data) {
        throw new Error(j.error ?? "Invalid code");
      }
      setDiscountResult(j.data);
      if (!j.data.isFree) setPaymentChoice("card");
    } catch (e) {
      setDiscountResult(null);
      setDiscountError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setIsValidating(false);
    }
  }

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

  async function recordConsents(bookingId: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        userId: user?.id ?? null,
        consentTypes: ["terms", "privacy", "ai_notes"],
      }),
    });
  }

  async function handleCreditBooking() {
    if (!selectedDate || !selectedSlot) return;
    if (!termsAccepted || !aiConsentAccepted) return;
    if (discountResult) {
      setError("Remove the discount code to pay with a credit, or pay by card.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const guestBookingReason = buildGuestBookingReason(
      data.reason,
      data.reasonCategory,
    );
    const referralCode = getReferralCode();

    try {
      const createRes = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: data.therapistId,
          date: selectedDate,
          startTime: selectedSlot,
          consentConfirmed: true,
          consentTimestamp: new Date().toISOString(),
          isAnonymous: false,
          guestBookingReason,
          professionalType: data.professionalType.trim() || undefined,
          referralCode: referralCode ?? undefined,
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

      await recordConsents(bookingId);

      const useRes = await fetch("/api/patient/credits/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId }),
      });
      const useJson = (await useRes.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!useRes.ok || !useJson.success) {
        throw new Error(useJson.error ?? "Could not apply credit");
      }

      void qc.invalidateQueries({ queryKey: ["patient-credits"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["patient-sessions"] });
      void qc.invalidateQueries({ queryKey: ["patient-sessions-list"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard", "stats"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard", "next"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard", "recent"] });

      setConfirmedBookingId(bookingId);
      setBookingSuccess(true);
      clearReferralCode();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCardPayment() {
    if (!selectedDate || !selectedSlot) return;
    if (!termsAccepted || !aiConsentAccepted) return;

    setIsSubmitting(true);
    setError("");

    const guestBookingReason = buildGuestBookingReason(
      data.reason,
      data.reasonCategory,
    );
    const referralCode = getReferralCode();

    try {
      const createRes = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: data.therapistId,
          date: selectedDate,
          startTime: selectedSlot,
          consentConfirmed: true,
          consentTimestamp: new Date().toISOString(),
          isAnonymous: false,
          guestBookingReason,
          professionalType: data.professionalType.trim() || undefined,
          referralCode: referralCode ?? undefined,
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

      await recordConsents(bookingId);

      const initRes = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          email: data.email.trim(),
          returnToPatientDashboard: true,
          discountCode: discountResult ? discountCode.trim().toUpperCase() : undefined,
          metadata: {
            booking_reason: guestBookingReason ?? "",
          },
        }),
      });
      const initJson = (await initRes.json()) as {
        success?: boolean;
        data?: {
          authorization_url?: string;
          isFree?: boolean;
          bookingId?: string;
        };
        error?: string;
      };
      if (!initRes.ok || !initJson.success || !initJson.data) {
        throw new Error(initJson.error ?? "Could not start payment");
      }
      if (initJson.data.isFree && initJson.data.bookingId) {
        void qc.invalidateQueries({ queryKey: ["patient-credits"] });
        void qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
        void qc.invalidateQueries({ queryKey: ["patient-sessions"] });
        void qc.invalidateQueries({ queryKey: ["patient-sessions-list"] });
        void qc.invalidateQueries({ queryKey: ["patient-dashboard", "stats"] });
        void qc.invalidateQueries({ queryKey: ["patient-dashboard", "next"] });
        void qc.invalidateQueries({ queryKey: ["patient-dashboard", "recent"] });
        setConfirmedBookingId(initJson.data.bookingId);
        setBookingSuccess(true);
        clearReferralCode();
        return;
      }
      if (!initJson.data.authorization_url) {
        throw new Error(initJson.error ?? "Could not start payment");
      }

      clearReferralCode();
      window.location.href = initJson.data.authorization_url;
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  const canProceed = Boolean(
    selectedDate && selectedSlot && termsAccepted && aiConsentAccepted,
  );

  const photo = data.therapistPhoto;
  const initial = data.therapistName?.[0] ?? "T";

  if (bookingSuccess && confirmedBookingId) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-50">
          <Check size={24} strokeWidth={2} className="text-green-600" />
        </div>
        <h3 className="mb-1 text-lg font-bold text-gray-900">Session booked! 🎉</h3>
        <p className="mb-6 text-sm text-gray-500">
          Check your WhatsApp for the session details and join link.
        </p>
        <div className="mb-6 space-y-2 rounded-xl bg-gray-50 p-3 text-left">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Therapist:</span>{" "}
            {data.therapistName}
          </p>
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Date:</span>{" "}
            {formatDateLabel(selectedDate)} at {formatSlotTo12h(selectedSlot)}
          </p>
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">Duration:</span>{" "}
            {data.therapistDuration} min
          </p>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="w-full rounded-xl bg-[#2C3B2D] py-3 font-medium text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

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
          <p className="truncate text-sm font-semibold text-gray-900">
            {data.therapistName}
          </p>
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
                {new Date(`${date}T12:00:00+01:00`).toLocaleDateString("en-NG", {
                  month: "short",
                })}
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
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Payment
          </p>
          {creditBalance > 0 && !discountResult ? (
            <button
              type="button"
              onClick={() => setPaymentChoice("credits")}
              className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                paymentMethod === "credits"
                  ? "border-[#2C3B2D] bg-[#2C3B2D]/5"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#2C3B2D]/10">
                    <CreditCard
                      size={18}
                      strokeWidth={1.5}
                      className="text-[#2C3B2D]"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">Use a credit</p>
                    <p className="text-xs text-gray-500">
                      You have {creditBalance} credit{creditBalance !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    paymentMethod === "credits"
                      ? "border-[#2C3B2D] bg-[#2C3B2D]"
                      : "border-gray-300"
                  }`}
                >
                  {paymentMethod === "credits" ? (
                    <div className="size-2 rounded-full bg-white" />
                  ) : null}
                </div>
              </div>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setPaymentChoice("card")}
            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
              paymentMethod === "card"
                ? "border-[#2C3B2D] bg-[#2C3B2D]/5"
                : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {freeByDiscount
                    ? "Free session — discount applied"
                    : partialDiscount && discountResult
                      ? `Pay ₦${discountResult.finalAmount.toLocaleString()} with card`
                      : `Pay ₦${data.therapistRate.toLocaleString()} with card`}
                </p>
                <p className="text-xs text-gray-500">
                  {freeByDiscount ? "No payment required" : "Secured by Paystack"}
                </p>
              </div>
              <div
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  paymentMethod === "card"
                    ? "border-[#2C3B2D] bg-[#2C3B2D]"
                    : "border-gray-300"
                }`}
              >
                {paymentMethod === "card" ? (
                  <div className="size-2 rounded-full bg-white" />
                ) : null}
              </div>
            </div>
          </button>
        </div>
      ) : null}

      {selectedSlot ? (
        <div className="space-y-2 rounded-xl bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Summary
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Session</span>
            <span className="font-medium text-gray-900">
              {data.therapistDuration} minutes
            </span>
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
              {data.fullName.trim()} with {data.therapistName}
            </span>
          </div>
          {paymentMethod === "card" ? (
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-sm font-bold text-gray-900">
                {discountResult ? (
                  <>
                    <span className="mr-2 text-gray-400 line-through">
                      ₦{data.therapistRate.toLocaleString()}
                    </span>
                    <span
                      className={
                        discountResult.isFree ? "text-primary" : "text-gray-900"
                      }
                    >
                      {discountResult.isFree
                        ? "FREE"
                        : `₦${discountResult.finalAmount.toLocaleString()}`}
                    </span>
                  </>
                ) : (
                  `₦${data.therapistRate.toLocaleString()}`
                )}
              </span>
            </div>
          ) : (
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-sm font-bold text-gray-900">1 credit</span>
            </div>
          )}
        </div>
      ) : null}

      {selectedSlot ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-700">Discount code</p>
          {discountResult ? (
            <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <Check
                  size={14}
                  strokeWidth={2.5}
                  className="shrink-0 text-green-600"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-green-800">
                    {discountCode} applied
                  </p>
                  <p className="text-xs text-green-600">
                    {discountResult.isFree
                      ? "Session is completely free!"
                      : `₦${discountResult.discountAmount.toLocaleString()} discount applied`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDiscountResult(null);
                  setDiscountCode("");
                  setDiscountError("");
                }}
                className="ml-3 shrink-0 text-xs text-green-600 underline hover:text-green-800"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setDiscountResult(null);
                      setDiscountError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleApplyCode();
                      }
                    }}
                    placeholder="Discount code"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm uppercase tracking-widest transition-colors focus:border-[#2C3B2D] focus:outline-none"
                  />
                  {isValidating ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="size-4 animate-spin rounded-full border-2 border-[#2C3B2D]/30 border-t-[#2C3B2D]" />
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleApplyCode()}
                  disabled={!discountCode.trim() || isValidating}
                  className="flex min-w-[72px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
                >
                  {isValidating ? (
                    <>
                      <div className="size-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                      <span>Checking</span>
                    </>
                  ) : (
                    "Apply"
                  )}
                </button>
              </div>
              {isValidating && validationSeconds >= 2 ? (
                <p className="mt-1 text-xs text-gray-400">
                  Checking code... ({validationSeconds}s)
                </p>
              ) : null}
            </>
          )}
          {discountError && !discountResult ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              <X size={12} strokeWidth={2} className="shrink-0" />
              <span>{discountError}</span>
            </div>
          ) : null}
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
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
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
            I consent to AI-assisted note generation. Audio is processed and permanently
            deleted. Notes are visible to my therapist only.
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

      <div className="flex flex-col gap-3">
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
            onClick={() =>
              paymentMethod === "credits"
                ? handleCreditBooking()
                : handleCardPayment()
            }
            disabled={!canProceed || isSubmitting}
            className={`flex flex-1 items-center justify-center rounded-xl py-3 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              freeByDiscount
                ? "bg-green-600 text-white hover:bg-green-700"
                : paymentMethod === "credits"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-[#2C3B2D] text-white hover:bg-[#3a4d3b]"
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Processing...
              </span>
            ) : freeByDiscount ? (
              "✓ Confirm Free Booking →"
            ) : paymentMethod === "credits" ? (
              "Confirm Booking →"
            ) : (
              `Pay ₦${(partialDiscount && discountResult ? discountResult.finalAmount : data.therapistRate).toLocaleString()} →`
            )}
          </button>
        </div>
        {isSubmitting ? (
          <div className="space-y-1 text-center">
            <p className="animate-pulse text-xs text-gray-500">
              {freeByDiscount
                ? "Confirming your free booking..."
                : paymentMethod === "credits"
                  ? "Confirming your booking..."
                  : "Redirecting to secure payment..."}
            </p>
            <p className="text-xs text-gray-400">Please do not close this window</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
