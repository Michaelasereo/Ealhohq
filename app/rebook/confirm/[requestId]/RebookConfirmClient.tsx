"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { EalhoBrandLogo } from "@/components/shared/EalhoBrandLogo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type RebookMeta = {
  status: string;
  expired: boolean;
  therapistName: string;
  therapistPhoto: string;
  sessionDuration: number;
  sessionType: string;
  suggestedDate: string;
  suggestedTime: string;
  startIso: string;
  expiresAt: string;
  sessionRateNgn: number;
};

async function fetchMeta(requestId: string): Promise<RebookMeta> {
  const r = await fetch(`/api/therapist/rebook/${requestId}`);
  const j = (await r.json()) as {
    success?: boolean;
    data?: RebookMeta;
    error?: string;
  };
  if (r.status === 404) {
    throw new Error("NOT_FOUND");
  }
  if (!r.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Failed to load");
  }
  return j.data;
}

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

function timeLine(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function RebookConfirmClient({ requestId }: { requestId: string }) {
  const searchParams = useSearchParams();
  const paid = searchParams.get("paid") === "1";
  const bookingIdFromQs = searchParams.get("bookingId");
  const reference =
    searchParams.get("reference") ?? searchParams.get("trxref") ?? "";

  const [consent, setConsent] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [useCredits, setUseCredits] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["rebook-meta", requestId],
    queryFn: () => fetchMeta(requestId),
  });

  const { data: credits } = useQuery({
    queryKey: ["rebook-credits"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const r = await fetch("/api/patient/credits", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { balance: number };
      };
      if (!r.ok || !j.success) return { balance: 0 };
      return j.data ?? { balance: 0 };
    },
  });

  useEffect(() => {
    if (!paid || !bookingIdFromQs || !reference.trim() || !data) return;
    let cancelled = false;
    (async () => {
      setPayBusy(true);
      try {
        const r = await fetch("/api/rebook/after-paystack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            bookingId: bookingIdFromQs,
            reference: reference.trim(),
          }),
        });
        const j = (await r.json()) as { success?: boolean; error?: string };
        if (cancelled) return;
        if (!r.ok || !j.success) {
          setPayErr(j.error ?? "Payment could not be completed");
          return;
        }
        setSuccess(true);
        void refetch();
      } finally {
        if (!cancelled) setPayBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paid, bookingIdFromQs, reference, requestId, data, refetch]);

  async function prepareAndPay() {
    setPayErr(null);
    if (!consent) {
      setPayErr("Please confirm consent to continue.");
      return;
    }
    if (!data) return;
    setPayBusy(true);
    try {
      const prep = await fetch("/api/rebook/prepare-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          consentConfirmed: true,
          consentTimestamp: new Date().toISOString(),
        }),
      });
      const pj = (await prep.json()) as {
        success?: boolean;
        data?: { bookingId: string; email: string };
        error?: string;
      };
      if (!prep.ok || !pj.success || !pj.data?.bookingId) {
        throw new Error(pj.error ?? "Could not prepare payment");
      }
      const init = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: pj.data.bookingId,
          email: pj.data.email,
          rebookRequestId: requestId,
        }),
      });
      const ij = (await init.json()) as {
        success?: boolean;
        data?: { authorization_url?: string };
        error?: string;
      };
      if (!init.ok || !ij.success || !ij.data?.authorization_url) {
        throw new Error(ij.error ?? "Could not start Paystack");
      }
      window.location.href = ij.data.authorization_url;
    } catch (e) {
      setPayErr(e instanceof Error ? e.message : "Error");
    } finally {
      setPayBusy(false);
    }
  }

  async function payWithCredits() {
    setPayErr(null);
    if (!consent) {
      setPayErr("Please confirm consent to continue.");
      return;
    }
    setPayBusy(true);
    try {
      const r = await fetch("/api/rebook/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestId, useCredits: true }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) {
        throw new Error(j.error ?? "Could not use credits");
      }
      setSuccess(true);
      void refetch();
    } catch (e) {
      setPayErr(e instanceof Error ? e.message : "Error");
    } finally {
      setPayBusy(false);
    }
  }

  async function decline() {
    setPayBusy(true);
    try {
      const r = await fetch("/api/rebook/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const j = (await r.json()) as { success?: boolean };
      if (r.ok && j.success) setDeclined(true);
    } finally {
      setPayBusy(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-4">
        <Skeleton className="h-16 w-40" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (isError) {
    const msg =
      error instanceof Error && error.message === "NOT_FOUND"
        ? "This link is invalid."
        : error instanceof Error
          ? error.message
          : "Error";
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="text-muted-foreground">{msg}</p>
      </main>
    );
  }

  if (!data) return null;

  if (data.status === "accepted" || success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center px-4 py-10 text-center">
        <EalhoBrandLogo className="mb-6" />
        <p className="text-lg font-semibold">You&apos;re all set</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your session is confirmed. Check WhatsApp for your join link.
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "default" }), "mt-8 min-h-12 w-full")}
        >
          Home
        </Link>
      </main>
    );
  }

  if (declined) {
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="font-medium">You have declined this session.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your therapist will be notified.
        </p>
      </main>
    );
  }

  if (data.expired || data.status === "expired") {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="font-semibold">This session offer has expired.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Contact your therapist to reschedule.
        </p>
      </main>
    );
  }

  if (data.status !== "pending") {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="text-muted-foreground">This link is no longer valid.</p>
      </main>
    );
  }

  const iso = data.startIso;
  const canCredits = (credits?.balance ?? 0) >= 1;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-6 px-4 py-8 pb-24">
      <div className="flex justify-center">
        <EalhoBrandLogo />
      </div>

      <h1 className="text-center text-xl font-semibold leading-snug">
        Session invitation from {data.therapistName}
      </h1>

      <div className="flex justify-center">
        <Image
          src={data.therapistPhoto}
          alt=""
          width={80}
          height={80}
          className="size-20 rounded-full object-cover"
          unoptimized={data.therapistPhoto.startsWith("http")}
        />
      </div>

      <div className="rounded-xl border p-4 text-sm space-y-2">
        <p>
          <span className="text-muted-foreground">Date</span>
          <br />
          <span className="font-medium">{longDate(iso)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Time (WAT)</span>
          <br />
          <span className="font-medium">{timeLine(iso)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Duration</span>
          <br />
          <span className="font-medium">{data.sessionDuration} minutes</span>
        </p>
        <p>
          <span className="text-muted-foreground">Type</span>
          <br />
          <span className="font-medium">
            {data.sessionType === "intake" ? "Intake" : "Follow-up"}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Fee</span>
          <br />
          <span className="font-medium">
            ₦{data.sessionRateNgn.toLocaleString("en-NG")}
          </span>
        </p>
      </div>

      {paid && payBusy ? (
        <p className="text-center text-sm text-muted-foreground">
          Confirming your payment…
        </p>
      ) : null}
      {payErr ? (
        <p className="text-center text-sm text-destructive">{payErr}</p>
      ) : null}

      {!paid ? (
        <>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 size-4"
            />
            <span>
              I consent to this booking and Ealho&apos;s session terms.
            </span>
          </label>

          {canCredits ? (
            <div className="flex gap-2 rounded-lg border p-3 text-sm">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md border px-3 py-2",
                  useCredits ? "border-primary bg-primary/10" : "border-border",
                )}
                onClick={() => setUseCredits(true)}
              >
                Pay with 1 credit
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md border px-3 py-2",
                  !useCredits ? "border-primary bg-primary/10" : "border-border",
                )}
                onClick={() => setUseCredits(false)}
              >
                Pay by card
              </button>
            </div>
          ) : null}

          <Button
            type="button"
            className="min-h-12 w-full"
            disabled={payBusy || !consent}
            onClick={() =>
              useCredits && canCredits ? void payWithCredits() : void prepareAndPay()
            }
          >
            {payBusy
              ? "Working…"
              : useCredits && canCredits
                ? "Confirm with credit"
                : "Confirm and pay"}
          </Button>

          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground underline"
            disabled={payBusy}
            onClick={() => void decline()}
          >
            Decline
          </button>
        </>
      ) : null}
    </main>
  );
}
