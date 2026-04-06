"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

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
  const [paymentMode, setPaymentMode] = useState<"paystack" | "package">(
    "paystack",
  );

  const needsGuest = Boolean(draft?.isGuest || !draft?.patientId);

  const { data: me } = useQuery({
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
        };
      };
      if (!r.ok || !j.success) return null;
      return j.data ?? null;
    },
    enabled: Boolean(draft?.patientId),
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
      if (!r.ok || !j.success) return null;
      return (
        j.data?.packages.find((p) => p.therapist.id === draft?.therapistId) ?? null
      );
    },
    enabled: Boolean(draft?.therapistId && draft?.patientId),
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

      {packageQ.data ? (
        <div className="rounded-xl border border-[#1A7A4A]/30 bg-[#F0FAF4] p-3 text-sm">
          <p className="font-medium">🎟 Use Package Credit</p>
          <p className="mt-1 text-muted-foreground">
            You have {packageQ.data.remainingSessions} session
            {packageQ.data.remainingSessions === 1 ? "" : "s"} remaining with{" "}
            {packageQ.data.therapist.name}
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant={paymentMode === "package" ? "default" : "outline"}
              className={cn(
                "min-h-11 flex-1",
                paymentMode === "package" &&
                  "bg-[#1A7A4A] text-white hover:bg-[#1A7A4A]/90",
              )}
              disabled={busy}
              onClick={() => setPaymentMode("package")}
            >
              Use Credit — Book Free
            </Button>
            <Button
              type="button"
              variant={paymentMode === "paystack" ? "default" : "outline"}
              className="min-h-11 flex-1"
              disabled={busy}
              onClick={() => setPaymentMode("paystack")}
            >
              Pay for new session
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
            : "Saving booking…"
          : payPhase === "initializing"
            ? "Opening Paystack…"
            : paymentMode === "package"
              ? "Use Credit — Book Free"
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
