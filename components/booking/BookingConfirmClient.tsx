"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { PackageSelector } from "@/components/booking/PackageSelector";
import { calculatePackagePrice, getPackageOption } from "@/lib/packages/config";
import { cn } from "@/lib/utils";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { useBookingStore } from "@/stores/bookingStore";

import { GuestDetailsForm, type GuestDetails } from "./GuestDetailsForm";

type Props = {
  listHref: string;
};

export function BookingConfirmClient({ listHref }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const draft = useBookingStore((s) => s.draft);
  const setDraft = useBookingStore((s) => s.setDraft);
  const selectedPackage = useBookingStore((s) => s.selectedPackage);
  const packagePrice = useBookingStore((s) => s.packagePrice);
  const setSelectedPackage = useBookingStore((s) => s.setSelectedPackage);

  const [guest, setGuest] = useState<GuestDetails>({
    fullName: "",
    email: "",
    phone: "",
  });
  const [consent, setConsent] = useState(false);
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [payPhase, setPayPhase] = useState<
    "idle" | "creating" | "initializing"
  >("idle");
  const [paymentMode, setPaymentMode] = useState<
    "paystack" | "package" | "partner"
  >("paystack");

  const needsGuest = Boolean(draft?.isGuest || !draft?.patientId);

  const { data: me, isError: meError } = useQuery({
    queryKey: ["patient-me"],
    queryFn: async () => {
      const r = await fetch("/api/patient/me");
      const j = (await r.json()) as {
        success: boolean;
        data?: {
          patient: {
            fullName: string;
            email: string;
            phone: string;
          } | null;
          partnerProgram: {
            partnerName: string;
            monthlyCreditsRemaining: number;
            onboardingStatus: string;
          } | null;
        };
      };
      if (!r.ok || !j.success) throw new Error("Failed to load account");
      return j.data ?? null;
    },
    enabled: Boolean(draft?.patientId),
    retry: 1,
  });

  const packageQ = useQuery({
    queryKey: ["patient-packages-inline", draft?.therapistId],
    queryFn: async () => {
      const r = await fetch("/api/patient/packages", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: {
          packages: {
            id: string;
            therapist: { id: string; name: string };
            remainingSessions: number;
          }[];
        };
      };
      if (!r.ok || !j.success) throw new Error("Failed to load packages");
      return (
        j.data?.packages.find((p) => p.therapist.id === draft?.therapistId) ?? null
      );
    },
    enabled: Boolean(draft?.therapistId && draft?.patientId),
    retry: 1,
  });

  useEffect(() => {
    if (me?.patient && draft?.patientId) {
      setGuest({
        fullName: me.patient.fullName,
        email: me.patient.email,
        phone: me.patient.phone,
      });
    }
  }, [me?.patient, draft?.patientId]);

  useEffect(() => {
    if (!draft?.therapistId) {
      router.replace(listHref);
    }
  }, [draft, listHref, router]);

  const createBooking = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!draft) throw new Error("No draft");
      if (!consent || !consentAt) {
        throw new Error("Please confirm consent before paying.");
      }
      const body: Record<string, unknown> = {
        therapistId: draft.therapistId,
        date: draft.date,
        startTime: draft.startTime,
        sessionType: draft.sessionType ?? "followup",
        consentConfirmed: true,
        consentTimestamp: consentAt,
        packageType: selectedPackage,
      };
      if (draft.patientId) {
        body.patientId = draft.patientId;
      } else {
        body.guestName = guest.fullName.trim();
        body.guestEmail = guest.email.trim();
        body.guestPhone = guest.phone.trim();
      }

      const r = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as {
        success: boolean;
        data?: { bookingId: string };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.bookingId) {
        throw new Error(j.error ?? "Could not create booking");
      }
      const bookingId = j.data.bookingId;
      setDraft({
        ...draft,
        bookingId,
        selectedPackage,
        packagePrice: naira,
      });
      return bookingId;
    },
  });

  const usePackageMut = useMutation({
    mutationFn: async () => {
      if (!draft?.therapistId || !draft.date || !draft.startTime) {
        throw new Error("Booking selection is incomplete.");
      }
      if (!packageQ.data?.id) {
        throw new Error("No active package found for this therapist.");
      }
      const r = await fetch("/api/bookings/use-package-credit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: packageQ.data.id,
          therapistId: draft.therapistId,
          date: draft.date,
          time: draft.startTime,
          sessionType: draft.sessionType ?? "followup",
          consentTimestamp: consentAt,
        }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { bookingId: string };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.bookingId) {
        throw new Error(j.error ?? "Could not use package credit");
      }
      return j.data.bookingId;
    },
  });

  const partnerEligible =
    Boolean(draft?.patientId) &&
    selectedPackage === "single" &&
    me?.partnerProgram?.onboardingStatus === "active" &&
    (me.partnerProgram.monthlyCreditsRemaining ?? 0) > 0;

  const hasPackageCredit = Boolean(
    packageQ.data && packageQ.data.remainingSessions > 0,
  );
  const showAlternatePayment = partnerEligible || hasPackageCredit;

  const userExplicitChoice = useRef(false);

  const choosePaymentMode = useCallback(
    (mode: "paystack" | "package" | "partner") => {
      userExplicitChoice.current = true;
      setPaymentMode(mode);
    },
    [],
  );

  useEffect(() => {
    setPaymentMode((prev) => {
      if (prev === "partner" && !partnerEligible) {
        userExplicitChoice.current = false;
        return hasPackageCredit ? "package" : "paystack";
      }
      if (prev === "package" && !hasPackageCredit) {
        userExplicitChoice.current = false;
        return partnerEligible ? "partner" : "paystack";
      }
      if (userExplicitChoice.current) return prev;
      if (partnerEligible) return "partner";
      if (hasPackageCredit) return "package";
      return prev;
    });
  }, [partnerEligible, hasPackageCredit]);

  const busy = payPhase !== "idle" || createBooking.isPending || usePackageMut.isPending;

  if (!draft?.therapistId) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </main>
    );
  }

  const startIso = bookingDateStartToIso(
    new Date(`${draft.date}T12:00:00+01:00`),
    draft.startTime,
  );

  const guestOk =
    !needsGuest ||
    (guest.fullName.trim() && guest.email.trim() && guest.phone.trim());

  const nairaBase =
    draft.sessionRateNaira ??
    Math.round(
      Number((draft.sessionRateFormatted || "").replace(/[^\d.]/g, "")) || 0,
    );
  const selectedPackageOption = getPackageOption(selectedPackage);
  const calculatedPackagePrice = calculatePackagePrice(
    nairaBase,
    selectedPackageOption,
  ).finalPrice;
  const naira = packagePrice > 0 ? packagePrice : calculatedPackagePrice;

  async function startPaystack() {
    setPayError(null);
    if (!consent || !consentAt) {
      setPayError("Please confirm consent before paying.");
      return;
    }
    if (!guestOk) {
      setPayError("Please complete your details.");
      return;
    }

    try {
      if (paymentMode === "package") {
        setPayPhase("creating");
        const bookingId = await usePackageMut.mutateAsync();
        router.push(`/dashboard/book/success?bookingId=${encodeURIComponent(bookingId)}`);
        return;
      }
      if (paymentMode === "partner") {
        if (!partnerEligible) {
          setPayError("Employer coverage is not available for this booking.");
          return;
        }
        setPayPhase("creating");
        const bookingId = await createBooking.mutateAsync();
        const pc = await fetch("/api/payment/partner-coverage", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });
        const pcJson = (await pc.json()) as { success?: boolean; error?: string };
        if (!pc.ok || !pcJson.success) {
          throw new Error(pcJson.error ?? "Could not apply employer coverage");
        }
        void queryClient.invalidateQueries({ queryKey: ["patient-me"] });
        router.push(
          `/dashboard/book/success?bookingId=${encodeURIComponent(bookingId)}`,
        );
        return;
      }
      setPayPhase("creating");
      let bookingId = useBookingStore.getState().draft?.bookingId;
      if (!bookingId) {
        bookingId = await createBooking.mutateAsync();
      }

      const emailForPay = guest.email.trim();
      setPayPhase("initializing");
      const initRes = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          email: emailForPay,
          packageType: selectedPackageOption.id,
        }),
      });
      const initJson = (await initRes.json()) as {
        success: boolean;
        data?: { authorization_url?: string };
        error?: string;
      };
      if (!initRes.ok || !initJson.success || !initJson.data?.authorization_url) {
        throw new Error(initJson.error ?? "Could not start payment");
      }
      window.location.href = initJson.data.authorization_url;
    } catch (e) {
      setPayPhase("idle");
      setPayError(
        e instanceof Error ? e.message : "Something went wrong",
      );
    }
  }

  const canPay = consent && guestOk && consentAt && !busy;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[375px] space-y-4 p-4">
      <h1 className="text-xl font-semibold">Confirm booking</h1>

      <div className="rounded-xl border p-4 text-sm">
        <p className="font-medium">{draft.therapistName}</p>
        <p className="text-muted-foreground">{formatWAT(startIso)} WAT</p>
        <p className="mt-2">
          {draft.sessionDuration} min · {draft.sessionRateFormatted}
        </p>
      </div>

      {needsGuest ? (
        <GuestDetailsForm value={guest} onChange={setGuest} disabled={busy} />
      ) : (
        <div className="rounded-xl border p-4 text-sm">
          <p className="font-medium">{guest.fullName}</p>
          <p>{guest.email}</p>
          <p>{guest.phone}</p>
        </div>
      )}

      <label className="flex items-start gap-3 text-sm leading-snug">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => {
            const c = e.target.checked;
            setConsent(c);
            setConsentAt(c ? new Date().toISOString() : null);
          }}
          className="mt-1 size-4 shrink-0"
        />
        <span>
          I consent to this session being processed for AI note generation.
          The recording is processed immediately and deleted after notes are
          created. Only session notes are stored.
        </span>
      </label>

      {meError ? (
        <p className="text-sm text-amber-700">
          Could not check employer coverage. You can still pay below.
        </p>
      ) : null}
      {packageQ.isError ? (
        <p className="text-sm text-amber-700">
          Could not check package credits. You can still pay below.
        </p>
      ) : null}

      {showAlternatePayment ? (
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-sm">
          <div className="space-y-1">
            <p className="font-medium">How would you like to pay?</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Pick one option. Employer coverage and package credit cannot be
              combined on the same booking.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {partnerEligible ? (
              <Button
                type="button"
                variant={paymentMode === "partner" ? "default" : "outline"}
                className={cn(
                  "min-h-12 w-full justify-center",
                  paymentMode === "partner" &&
                    "bg-emerald-800 text-white hover:bg-emerald-800/90",
                )}
                disabled={busy}
                onClick={() => choosePaymentMode("partner")}
              >
                Employer coverage — {me?.partnerProgram?.partnerName} (
                {me?.partnerProgram?.monthlyCreditsRemaining} left this month)
              </Button>
            ) : null}
            {hasPackageCredit && packageQ.data ? (
              <Button
                type="button"
                variant={paymentMode === "package" ? "default" : "outline"}
                className={cn(
                  "min-h-12 w-full justify-center",
                  paymentMode === "package" &&
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                disabled={busy}
                onClick={() => choosePaymentMode("package")}
              >
                Package credit — {packageQ.data.remainingSessions} session
                {packageQ.data.remainingSessions === 1 ? "" : "s"} with{" "}
                {packageQ.data.therapist.name}
              </Button>
            ) : null}
            <Button
              type="button"
              variant={paymentMode === "paystack" ? "default" : "outline"}
              className="min-h-12 w-full justify-center"
              disabled={busy}
              onClick={() => choosePaymentMode("paystack")}
            >
              Pay now · ₦{naira.toLocaleString("en-NG")}
            </Button>
          </div>
        </div>
      ) : null}

      <PackageSelector
        sessionRate={nairaBase}
        therapistName={draft.therapistName}
        selectedPackage={selectedPackage}
        onSelect={(packageId) => setSelectedPackage(packageId, nairaBase)}
      />

      {payError ? (
        <p className="text-sm text-destructive">{payError}</p>
      ) : null}
      {createBooking.isError ? (
        <p className="text-sm text-destructive">
          {createBooking.error instanceof Error
            ? createBooking.error.message
            : "Error"}
        </p>
      ) : null}

      <Button
        type="button"
        className="min-h-12 w-full bg-primary text-primary-foreground"
        disabled={!canPay}
        onClick={() => void startPaystack()}
      >
        {payPhase === "creating"
          ? paymentMode === "package"
            ? "Booking with package credit…"
            : paymentMode === "partner"
              ? "Confirming with employer coverage…"
              : "Saving booking…"
          : payPhase === "initializing"
            ? "Opening Paystack…"
            : paymentMode === "package"
              ? "Use Credit — Book Free"
              : paymentMode === "partner"
                ? "Confirm with employer coverage"
                : `Pay ₦${naira.toLocaleString("en-NG")}`}
      </Button>

      <Link
        href={listHref}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "flex min-h-12 w-full items-center justify-center",
        )}
      >
        Back
      </Link>
    </main>
  );
}
