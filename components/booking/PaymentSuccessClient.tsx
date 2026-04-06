"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  Bell,
  CircleCheckBig,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import {
  formatSlot12hWat,
  formatWatLongDate,
} from "@/lib/booking/display-wat";
import { bookingDateToWatYmd } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";
import { toast } from "sonner";

type BookingDetail = {
  id: string;
  date: string;
  startTime: string;
  sessionDuration: number;
  sessionRateFormatted: string;
  therapistName: string;
  therapistPhoto?: string;
  sessionType?: string;
  isAnonymous?: boolean;
  guestEmail?: string | null;
};

type VerifyPayload = {
  booking: BookingDetail;
};

type ConfirmPayload = {
  therapistName: string;
  therapistPhoto: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  sessionType: string;
  isAnonymous?: boolean;
  guestEmail?: string | null;
};

type Props = {
  signupHref: string;
  bookAgainHref: string;
};

const BENEFITS: { icon: typeof Clock; text: string }[] = [
  { icon: Clock, text: "View and manage all your sessions in one place" },
  { icon: RefreshCw, text: "Rebook in seconds — details saved automatically" },
  { icon: CreditCard, text: "Earn credits and save up to 20% on sessions" },
  { icon: Bell, text: "Session reminders on WhatsApp and email" },
  { icon: Shield, text: "Secure session history, always accessible" },
];

export function PaymentSuccessClient({
  signupHref,
  bookAgainHref,
}: Props) {
  const searchParams = useSearchParams();
  const resetDraft = useBookingStore((s) => s.reset);

  const reference =
    searchParams.get("reference") ?? searchParams.get("trxref");
  const bookingId = searchParams.get("bookingId");

  const [phase, setPhase] = useState<
    "loading" | "success" | "error" | "missing"
  >("loading");
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signupPromptDismissed, setSignupPromptDismissed] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setPhase("missing");
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
            setPhase("error");
            return;
          }
          setDetail({
            ...j.data.booking,
            therapistPhoto: j.data.booking.therapistPhoto ?? "/Ealho-logo.png",
            sessionType: j.data.booking.sessionType ?? "followup",
          });
          setPhase("success");
          resetDraft();
          confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 } });
          toast.success("Session booked! ✅");
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
          setPhase("error");
          return;
        }
        const c = cj.data;
        setDetail({
          id: bookingId,
          date: c.date,
          startTime: c.startTime,
          sessionDuration: c.durationMinutes,
          sessionRateFormatted: "",
          therapistName: c.therapistName,
          therapistPhoto: c.therapistPhoto,
          sessionType: c.sessionType,
          isAnonymous: c.isAnonymous,
          guestEmail: c.guestEmail,
        });
        setPhase("success");
        resetDraft();
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.4 } });
        toast.success("Session booked! ✅");
      } catch {
        if (!cancelled) {
          setMessage("Could not load booking");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference, bookingId, resetDraft]);

  if (phase === "loading") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col items-center justify-center gap-4 px-4 py-8">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="text-center text-sm font-medium">
          Confirming your booking…
        </p>
      </main>
    );
  }

  if (phase === "missing" || phase === "error") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-[375px] space-y-4 px-4 py-8">
        <h1 className="text-xl font-semibold">Payment verification</h1>
        <p className="text-sm text-muted-foreground">
          {phase === "missing"
            ? "Missing booking link. If you completed payment, check your email or contact support."
            : message ?? "Payment could not be verified."}
        </p>
        <p className="text-sm">
          Contact us at{" "}
          <a className="text-primary underline" href="mailto:hello@ealho.com">
            hello@ealho.com
          </a>
        </p>
        <Link
          href={bookAgainHref}
          className={cn(
            buttonVariants({ variant: "default" }),
            "flex min-h-12 w-full items-center justify-center bg-primary text-primary-foreground",
          )}
        >
          Try again
        </Link>
      </main>
    );
  }

  const dateYmd = bookingDateToWatYmd(new Date(detail!.date));
  const photo = detail!.therapistPhoto ?? "/Ealho-logo.png";
  const sessionTypeLabel =
    detail!.sessionType === "intake" ? "Intake" : "Follow-up";
  const isAnon = Boolean(detail?.isAnonymous);
  const emailForSignup = detail?.guestEmail?.trim() ?? "";
  const signupWithEmail = `${signupHref}${signupHref.includes("?") ? "&" : "?"}email=${encodeURIComponent(emailForSignup)}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[375px] space-y-5 px-4 py-8">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <CircleCheckBig
            className="mx-auto size-16 text-primary"
            aria-hidden
          />
        </motion.div>
        <h1 className="mt-4 text-2xl font-semibold">Booking Confirmed! 🎉</h1>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 border-b bg-muted/30 p-4">
          <Image
            src={photo}
            alt=""
            width={56}
            height={56}
            className="size-14 rounded-full object-cover"
            unoptimized={photo.startsWith("http")}
          />
          <div className="text-left text-sm">
            <p className="font-semibold">{detail!.therapistName}</p>
            <p className="text-muted-foreground">{sessionTypeLabel}</p>
          </div>
        </div>
        <div className="p-4 text-sm">
          <p className="text-muted-foreground">{formatWatLongDate(dateYmd)}</p>
          <p className="text-muted-foreground">
            {formatSlot12hWat(detail!.startTime)} WAT
          </p>
          <p className="mt-2">
            {detail!.sessionDuration} min
            {detail!.sessionRateFormatted
              ? ` · ${detail!.sessionRateFormatted}`
              : ""}
          </p>
        </div>
      </div>

      {isAnon ? (
        <>
          <p className="text-center text-sm font-medium text-primary">
            Your session link has been sent to your email
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Add our sender to your contacts so you don&apos;t miss it.
          </p>
        </>
      ) : (
        <>
          <p className="text-center text-sm font-medium text-primary">
            Check your WhatsApp for your session link
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Check your email too — we sent a confirmation.
          </p>
        </>
      )}

      {!signupPromptDismissed ? (
        <section
          className="rounded-xl border border-[#292612]/10 p-4"
          style={{ backgroundColor: "rgba(44, 59, 45, 0.05)" }}
        >
          <h2 className="text-lg font-semibold text-[#292612]">
            Get more from Ealho
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a free account to unlock:
          </p>
          <ul className="mt-3 space-y-3">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm leading-snug">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#292612]/10">
                  <Icon className="size-4 text-[#292612]" strokeWidth={1.5} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          {isAnon ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Create an account with just your email — no real name required.
            </p>
          ) : null}
          <Link
            href={emailForSignup ? signupWithEmail : signupHref}
            className={cn(
              buttonVariants({ variant: "default" }),
              "mt-4 flex min-h-12 w-full items-center justify-center border-0 font-semibold text-[#D6EAE1]",
            )}
            style={{ backgroundColor: "#292612" }}
          >
            Create Free Account
          </Link>
          <button
            type="button"
            className="mt-3 w-full min-h-11 text-center text-xs text-muted-foreground underline"
            onClick={() => setSignupPromptDismissed(true)}
          >
            Maybe later
          </button>
        </section>
      ) : null}

      <Link
        href={bookAgainHref}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "flex min-h-12 w-full items-center justify-center",
        )}
      >
        Book another session
      </Link>
    </main>
  );
}
