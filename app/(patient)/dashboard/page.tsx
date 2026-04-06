"use client";

import { Check, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import PatientBookingFlow from "@/components/patient/PatientBookingFlow";
import { PatientDashboardHome } from "@/components/patient/PatientDashboardHome";
import { LoadingWithCopy } from "@/components/shared/LoadingWithCopy";
import { DASHBOARD_MESSAGES } from "@/lib/loading-messages";

function Fallback() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center p-4 pb-24 md:pb-8">
      <LoadingWithCopy
        messages={[...DASHBOARD_MESSAGES]}
        size="lg"
        showProgressBar
        estimatedSeconds={4}
      />
    </main>
  );
}

function PatientDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get("view") === "book" ? "book" : "home";
  const [showBookingSuccess, setShowBookingSuccess] = useState(false);
  const paystackHandled = useRef(false);

  useEffect(() => {
    const bookingStatus = searchParams.get("booking");
    const reference =
      searchParams.get("reference") ?? searchParams.get("trxref");
    const bookingId = searchParams.get("bookingId");

    if (
      bookingStatus !== "success" ||
      !reference?.trim() ||
      !bookingId?.trim()
    ) {
      return;
    }

    const refKey = `ealho-paystack-${bookingId.trim()}-${reference.trim()}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(refKey)) {
      router.replace("/dashboard", { scroll: false });
      return;
    }

    if (paystackHandled.current) return;
    paystackHandled.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            reference: reference.trim(),
            bookingId: bookingId.trim(),
          }),
        });
        if (!res.ok) {
          paystackHandled.current = false;
          return;
        }
        sessionStorage.setItem(refKey, "1");
        router.replace("/dashboard", { scroll: false });
        setShowBookingSuccess(true);
        window.setTimeout(() => setShowBookingSuccess(false), 8000);
      } catch {
        paystackHandled.current = false;
      }
    })();
  }, [searchParams, router]);

  function handleStartBooking() {
    router.replace("/dashboard?view=book", { scroll: false });
  }

  function handleBookingComplete() {
    router.replace("/dashboard", { scroll: false });
  }

  function handleCancelBooking() {
    router.replace("/dashboard", { scroll: false });
  }

  return (
    <div className="p-4 pb-24 md:ml-0 md:p-6 md:pb-8">
      {showBookingSuccess ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <Check
            size={16}
            strokeWidth={2}
            className="shrink-0 text-green-600"
            aria-hidden
          />
          <p className="text-sm font-medium text-green-800">
            Session booked successfully! Check your WhatsApp for the session link.
          </p>
          <button
            type="button"
            onClick={() => setShowBookingSuccess(false)}
            className="ml-auto text-green-600 hover:text-green-800"
            aria-label="Dismiss"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      ) : null}

      {view === "book" ? (
        <PatientBookingFlow
          onComplete={handleBookingComplete}
          onCancel={handleCancelBooking}
        />
      ) : (
        <PatientDashboardHome onBookSession={handleStartBooking} />
      )}
    </div>
  );
}

export default function PatientDashboardPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PatientDashboardContent />
    </Suspense>
  );
}
