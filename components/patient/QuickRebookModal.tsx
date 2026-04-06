"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LoadingWithCopy } from "@/components/shared/LoadingWithCopy";
import { Skeleton } from "@/components/ui/skeleton";
import { REBOOK_MESSAGES } from "@/lib/loading-messages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type QuickRebookModalProps = {
  therapistId: string;
  therapistName: string;
  therapistPhoto: string;
  isOpen: boolean;
  onClose: () => void;
  onBooked?: () => void;
};

type QuickRebookPayload = {
  therapist: {
    id: string;
    name: string;
    photo: string;
    sessionRate: number;
    sessionDuration: number;
  };
  nextAvailableSlots: {
    date: string;
    time: string;
    displayDate: string;
    displayTime: string;
  }[];
  sessionType: string;
  sessionCount: number;
  activePackage: {
    id: string;
    packageType: string;
    totalSessions: number;
    usedSessions: number;
    remainingSessions: number;
    expiresAt: string | null;
  } | null;
};

async function postQuickRebook(therapistId: string): Promise<QuickRebookPayload> {
  const r = await fetch("/api/patient/quick-rebook", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ therapistId }),
  });
  const j = (await r.json()) as {
    success?: boolean;
    data?: QuickRebookPayload;
    error?: string;
  };
  if (!r.ok || !j.success || !j.data) {
    throw new Error(j.error ?? "Could not load availability");
  }
  return j.data;
}

async function fetchCreditBalance(): Promise<number> {
  const r = await fetch("/api/credits/balance", { credentials: "include" });
  const j = (await r.json()) as { success?: boolean; data?: { balance: number } };
  if (!r.ok || !j.success) return 0;
  return j.data?.balance ?? 0;
}

async function fetchPatientEmail(): Promise<string> {
  const r = await fetch("/api/patient/me", { credentials: "include" });
  const j = (await r.json()) as {
    success?: boolean;
    data?: { patient?: { email?: string } | null };
  };
  if (!r.ok || !j.success) return "";
  return j.data?.patient?.email?.trim() ?? "";
}

export function QuickRebookModal({
  therapistId,
  therapistName,
  therapistPhoto,
  isOpen,
  onClose,
  onBooked,
}: QuickRebookModalProps) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(
    null,
  );
  const [consent, setConsent] = useState(false);
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [payWithCredit, setPayWithCredit] = useState(true);
  const [usePackageCredit, setUsePackageCredit] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const qb = useQuery({
    queryKey: ["patient-quick-rebook", therapistId],
    queryFn: () => postQuickRebook(therapistId),
    enabled: isOpen && Boolean(therapistId),
  });

  const creditsQ = useQuery({
    queryKey: ["credits-balance"],
    queryFn: fetchCreditBalance,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setConsent(false);
    setConsentAt(null);
    setLocalError(null);
    setPayWithCredit(true);
    setUsePackageCredit(false);
  }, [isOpen, therapistId]);

  useEffect(() => {
    if (creditsQ.data !== undefined && creditsQ.data < 1) {
      setPayWithCredit(false);
    }
  }, [creditsQ.data]);

  const bookMut = useMutation({
    onMutate: () => ({ toastId: toast.loading("Processing payment...") }),
    mutationFn: async () => {
      setLocalError(null);
      if (!selected) throw new Error("Choose a time slot.");
      if (!consent || !consentAt) {
        throw new Error("Please confirm consent before paying.");
      }
      const payload = await qb.data;
      if (!payload) throw new Error("Still loading.");

      if (usePackageCredit) {
        if (!payload.activePackage?.id) {
          throw new Error("No active package available for this therapist.");
        }
        const packageRes = await fetch("/api/bookings/use-package-credit", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packageId: payload.activePackage.id,
            therapistId: payload.therapist.id,
            date: selected.date,
            time: selected.time,
            sessionType: payload.sessionType === "intake" ? "intake" : "followup",
            consentTimestamp: consentAt,
          }),
        });
        const packageJson = (await packageRes.json()) as {
          success?: boolean;
          data?: { bookingId: string };
          error?: string;
        };
        if (!packageRes.ok || !packageJson.success || !packageJson.data?.bookingId) {
          throw new Error(packageJson.error ?? "Could not use package credit");
        }
        return { redirected: false as const };
      }

      const useCredits = Boolean(creditsQ.data && creditsQ.data >= 1 && payWithCredit);

      const r = await fetch("/api/patient/bookings/create-registered", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: payload.therapist.id,
          date: selected.date,
          time: selected.time,
          sessionType: payload.sessionType === "intake" ? "intake" : "followup",
          useCredits,
          consentConfirmed: true,
          consentTimestamp: consentAt,
        }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { bookingId: string; paidWithCredits?: boolean };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.bookingId) {
        throw new Error(j.error ?? "Booking failed");
      }

      if (!j.data.paidWithCredits) {
        const email = await fetchPatientEmail();
        if (!email) {
          throw new Error("Add an email to your profile before paying by card.");
        }
        const init = await fetch("/api/payment/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: j.data.bookingId,
            email,
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
        return { redirected: true as const };
      }

      return { redirected: false as const };
    },
    onSuccess: (res, _v, ctx) => {
      if (ctx?.toastId) toast.dismiss(ctx.toastId);
      if (res.redirected) return;
      toast.success("Session booked! ✅");
      void qc.invalidateQueries({ queryKey: ["patient-sessions"] });
      void qc.invalidateQueries({ queryKey: ["patient-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["credits-balance"] });
      void qc.invalidateQueries({ queryKey: ["patient-last-therapist"] });
      onBooked?.();
      onClose();
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.toastId) toast.dismiss(ctx.toastId);
      toast.error("Payment failed. Please try again.");
    },
  });

  const displayName = therapistName;
  const busy = bookMut.isPending || qb.isLoading;
  const balance = creditsQ.data ?? 0;
  const hasCredits = balance >= 1;
  const rate = qb.data?.therapist.sessionRate ?? 0;
  const duration = qb.data?.therapist.sessionDuration ?? 50;
  const activePackage = qb.data?.activePackage ?? null;

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl p-0"
        showCloseButton={false}
      >
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-popover px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                <Image
                  src={therapistPhoto}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 object-cover"
                  unoptimized={therapistPhoto.startsWith("http")}
                />
              </div>
              <div className="min-w-0 text-left">
                <SheetTitle className="text-left text-base leading-snug">
                  Book again with {displayName}
                </SheetTitle>
                {qb.data ? (
                  <p className="text-xs text-muted-foreground">
                    {qb.data.sessionCount} session
                    {qb.data.sessionCount === 1 ? "" : "s"} together
                  </p>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 shrink-0"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8 pt-4">
          {qb.isLoading ? (
            <div className="flex min-h-[140px] items-center justify-center py-4">
              <LoadingWithCopy messages={[...REBOOK_MESSAGES]} size="md" />
            </div>
          ) : qb.isError ? (
            <p className="text-sm text-destructive">
              {qb.error instanceof Error ? qb.error.message : "Something went wrong"}
            </p>
          ) : !qb.data?.nextAvailableSlots.length ? (
            <p className="text-sm text-muted-foreground">
              No open slots in the next few weeks. Try another therapist or check
              back soon.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Pick a time</p>
                <div className="grid gap-2">
                  {qb.data.nextAvailableSlots.map((slot) => {
                    const active =
                      selected?.date === slot.date && selected?.time === slot.time;
                    return (
                      <button
                        key={`${slot.date}-${slot.time}`}
                        type="button"
                        disabled={busy}
                        onClick={() => setSelected({ date: slot.date, time: slot.time })}
                        className={cn(
                          "rounded-xl border p-3 text-left text-sm transition-colors",
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:bg-muted/40",
                        )}
                      >
                        <p className="font-medium">{slot.displayDate}</p>
                        <p className="text-muted-foreground">{slot.displayTime}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {duration} min · ₦{rate.toLocaleString("en-NG")}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <Link
                  href={`/dashboard/book/${therapistId}`}
                  className="inline-block text-sm font-medium text-primary underline"
                  onClick={onClose}
                >
                  See more times
                </Link>
              </div>

              {activePackage ? (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
                  <p className="font-medium">🎟 Use Package Credit</p>
                  <p className="mt-1 text-muted-foreground">
                    You have {activePackage.remainingSessions} session
                    {activePackage.remainingSessions === 1 ? "" : "s"} remaining with{" "}
                    {displayName}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant={usePackageCredit ? "default" : "outline"}
                      className={cn(
                        "min-h-11 flex-1",
                        usePackageCredit &&
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                      disabled={busy}
                      onClick={() => setUsePackageCredit(true)}
                    >
                      Use Credit — Book Free
                    </Button>
                    <Button
                      type="button"
                      variant={!usePackageCredit ? "default" : "outline"}
                      className="min-h-11 flex-1"
                      disabled={busy}
                      onClick={() => setUsePackageCredit(false)}
                    >
                      Pay new session
                    </Button>
                  </div>
                </div>
              ) : null}

              {hasCredits && !usePackageCredit ? (
                <div className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">You have {balance} credit{balance === 1 ? "" : "s"}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant={payWithCredit ? "default" : "outline"}
                      className={cn(
                        "min-h-11 flex-1",
                        payWithCredit && "bg-primary text-primary-foreground",
                      )}
                      disabled={busy}
                      onClick={() => setPayWithCredit(true)}
                    >
                      Pay with credit
                    </Button>
                    <Button
                      type="button"
                      variant={!payWithCredit ? "default" : "outline"}
                      className={cn(
                        "min-h-11 flex-1",
                        !payWithCredit && "bg-primary text-primary-foreground",
                      )}
                      disabled={busy}
                      onClick={() => setPayWithCredit(false)}
                    >
                      Pay by card
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">
                  {usePackageCredit ? "Package credit" : `₦${rate.toLocaleString("en-NG")}`}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {duration} minutes
                  </span>
                </p>
              </div>

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

              {localError ? (
                <p className="text-sm text-destructive">{localError}</p>
              ) : null}
              {bookMut.isError ? (
                <p className="text-sm text-destructive">
                  {bookMut.error instanceof Error
                    ? bookMut.error.message
                    : "Booking failed"}
                </p>
              ) : null}

              <Button
                type="button"
                className="min-h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={
                  !selected ||
                  !consent ||
                  !consentAt ||
                  busy
                }
                onClick={() =>
                  bookMut.mutate(undefined, {
                    onError: (e) =>
                      setLocalError(e instanceof Error ? e.message : "Error"),
                  })
                }
              >
                {bookMut.isPending
                  ? usePackageCredit
                    ? "Booking with package credit…"
                    : payWithCredit && hasCredits
                    ? "Booking…"
                    : "Opening Paystack…"
                  : usePackageCredit
                    ? "Use Credit — Book Free"
                    : "Confirm and pay"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
