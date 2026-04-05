"use client";

import { Calendar, Check, Clock, Loader2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { formatSlot12hWat, formatWatLongDate } from "@/lib/booking/display-wat";
import { bookingDateToWatYmd } from "@/lib/wat-datetime";
import { useBookingStore } from "@/stores/bookingStore";

type BookingDetail = {
  id: string;
  date: string;
  startTime: string;
  sessionDuration: number;
  therapistName: string;
  therapistPhoto?: string;
  guestEmail?: string | null;
  isAnonymous?: boolean;
};

type VerifyPayload = { booking: BookingDetail };

type ConfirmPayload = {
  therapistName: string;
  therapistPhoto: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  isAnonymous?: boolean;
  guestEmail?: string | null;
};

export function PaymentSuccessModal() {
  const searchParams = useSearchParams();
  const resetDraft = useBookingStore((s) => s.reset);

  const reference =
    searchParams.get("reference") ?? searchParams.get("trxref");
  const bookingId = searchParams.get("bookingId");

  const [state, setState] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setState("error");
      setMessage("Missing booking link.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        if (reference?.trim()) {
          const r = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: reference.trim(),
              bookingId,
            }),
          });
          const j = (await r.json()) as {
            success: boolean;
            data?: VerifyPayload;
            error?: string;
          };
          if (cancelled) return;
          if (!r.ok || !j.success || !j.data?.booking) {
            setMessage(j.error ?? "Payment could not be verified");
            setState("error");
            return;
          }
          setBooking({
            ...j.data.booking,
            therapistPhoto: j.data.booking.therapistPhoto ?? "/Ealho-logo.png",
          });
          setState("success");
          resetDraft();
          return;
        }

        const cr = await fetch(
          `/api/bookings/${encodeURIComponent(bookingId)}/confirmation`,
        );
        const cj = (await cr.json()) as {
          success?: boolean;
          data?: ConfirmPayload;
          error?: string;
        };
        if (cancelled) return;
        if (!cr.ok || !cj.success || !cj.data) {
          setMessage(cj.error ?? "Booking not found");
          setState("error");
          return;
        }
        const c = cj.data;
        setBooking({
          id: bookingId,
          date: c.date,
          startTime: c.startTime,
          sessionDuration: c.durationMinutes,
          therapistName: c.therapistName,
          therapistPhoto: c.therapistPhoto,
          isAnonymous: c.isAnonymous,
          guestEmail: c.guestEmail,
        });
        setState("success");
        resetDraft();
      } catch {
        if (!cancelled) {
          setMessage("Could not load booking");
          setState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, bookingId, resetDraft]);

  const emailForSignup = booking?.guestEmail?.trim() ?? "";
  const signupHref = `/signup?email=${encodeURIComponent(emailForSignup)}`;

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
      <div className="flex justify-end p-4 pb-0">
        <Link href="/">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} className="text-gray-600" />
          </button>
        </Link>
      </div>

      <div className="px-8 pb-8">
        {state === "verifying" && (
          <div className="py-8 text-center">
            <Loader2
              className="mx-auto mb-4 size-12 animate-spin text-primary"
              aria-hidden
            />
            <p className="text-sm text-gray-500">Confirming your booking…</p>
          </div>
        )}

        {state === "success" && booking && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-green-50">
              <Check size={28} strokeWidth={2} className="text-green-600" />
            </div>

            <h2 className="mb-1 text-xl font-bold text-gray-900">
              You&apos;re booked!
            </h2>
            <p className="mb-6 text-sm text-gray-500">
              Your session is confirmed. Check your WhatsApp and email for the session link.
            </p>

            <div className="mb-6 space-y-2.5 rounded-xl bg-gray-50 p-4 text-left">
              <div className="flex items-center gap-2.5">
                <Image
                  src={booking.therapistPhoto ?? "/Ealho-logo.png"}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0 rounded-full object-cover"
                  unoptimized={Boolean(booking.therapistPhoto?.startsWith("http"))}
                />
                <span className="text-sm font-medium text-gray-700">{booking.therapistName}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar size={14} strokeWidth={1.5} className="shrink-0 text-primary" />
                <span className="text-sm text-gray-700">
                  {formatWatLongDate(bookingDateToWatYmd(new Date(booking.date)))}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock size={14} strokeWidth={1.5} className="shrink-0 text-primary" />
                <span className="text-sm text-gray-700">
                  {formatSlot12hWat(booking.startTime)}
                </span>
              </div>
            </div>

            <div className="mb-5 rounded-xl bg-primary/5 p-4 text-left">
              <p className="mb-1 text-sm font-semibold text-gray-900">Save time next time</p>
              <p className="mb-3 text-xs text-gray-500">
                Create a free account to rebook in seconds, track your sessions, and earn credits.
              </p>
              <Link
                href={emailForSignup ? signupHref : "/signup"}
                className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Create Free Account
              </Link>
            </div>

            <Link
              href="/"
              className="text-xs text-gray-400 underline hover:text-gray-600"
            >
              Return to homepage
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-50">
              <X size={20} strokeWidth={2} className="text-red-500" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              Payment could not be verified
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              {message ??
                "If you were charged, please contact us and we will resolve it immediately."}
            </p>
            <a
              href="mailto:hello@ealhohq.com"
              className="text-sm font-medium text-primary underline"
            >
              hello@ealhohq.com
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
