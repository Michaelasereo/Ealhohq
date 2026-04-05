"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EyeOff, Lock } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatSlot12hWat,
  formatWatLongDate,
} from "@/lib/booking/display-wat";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

const BOOKING_REASON_OPTIONS = [
  "Anxiety",
  "Depression",
  "Relationship issues",
  "Work stress",
  "Grief",
  "General wellbeing",
  "Other",
] as const;

function buildGuestSchema(isAnonymous: boolean) {
  return z
    .object({
      fullName: z
        .string()
        .trim()
        .min(2, "Enter at least 2 characters"),
      email: z.string().trim().email("Enter a valid email"),
      phone: z.string().trim(),
      bookingReason: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const digits = data.phone.replace(/\D/g, "");
      if (!isAnonymous) {
        if (!data.phone.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Phone is required",
            path: ["phone"],
          });
          return;
        }
        if (digits.length < 11) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Enter a valid Nigerian phone number (min 11 digits)",
            path: ["phone"],
          });
        }
      } else if (data.phone.trim() && digits.length < 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Enter a valid Nigerian phone number (min 11 digits)",
          path: ["phone"],
        });
      }
    });
}

type GuestForm = z.infer<ReturnType<typeof buildGuestSchema>>;

export function GuestBookConfirmClient() {
  const router = useRouter();
  const draft = useBookingStore((s) => s.draft);
  const setDraft = useBookingStore((s) => s.setDraft);

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [consentLegal, setConsentLegal] = useState(false);
  const [consentAi, setConsentAi] = useState(false);
  const [consentAt, setConsentAt] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [payPhase, setPayPhase] = useState<
    "idle" | "creating" | "initializing"
  >("idle");

  const guestSchema = useMemo(() => buildGuestSchema(isAnonymous), [
    isAnonymous,
  ]);

  const form = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      bookingReason: "",
    },
  });

  useEffect(() => {
    void form.trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revalidate when anonymous toggle changes
  }, [isAnonymous]);

  useEffect(() => {
    if (!draft?.therapistId) {
      router.replace("/book");
    }
  }, [draft?.therapistId, router]);

  useEffect(() => {
    if (draft?.patientId) {
      router.replace("/dashboard/book/confirm");
    }
  }, [draft?.patientId, router]);

  useEffect(() => {
    if (consentLegal && consentAi) {
      setConsentAt((c) => c ?? new Date().toISOString());
    } else {
      setConsentAt(null);
    }
  }, [consentLegal, consentAi]);

  if (!draft?.therapistId) {
    return (
      <main className="mx-auto w-full max-w-[375px] px-4 py-4">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </main>
    );
  }

  const naira =
    draft.sessionRateNaira ??
    Math.round(
      Number((draft.sessionRateFormatted || "").replace(/[^\d.]/g, "")) || 0,
    );

  const photo = draft.profilePhoto || "/Ealho-logo.png";
  const remote = Boolean(draft.profilePhoto?.startsWith("http"));

  const busy = payPhase !== "idle";

  async function onPay(values: GuestForm) {
    setPayError(null);
    if (!consentLegal || !consentAi) {
      setPayError("Please accept both consent statements before paying.");
      return;
    }
    const stamp = consentAt ?? new Date().toISOString();

    const d = useBookingStore.getState().draft;
    if (!d?.therapistId) {
      setPayError("Your booking session expired. Start again from the calendar.");
      return;
    }

    const reason = values.bookingReason?.trim();
    const allowed = new Set<string>(BOOKING_REASON_OPTIONS);
    const safeReason =
      reason && allowed.has(reason) ? reason : undefined;

    try {
      setPayPhase("creating");
      const createRes = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId: d.therapistId,
          date: d.date,
          startTime: d.startTime,
          sessionType: d.sessionType ?? "followup",
          consentConfirmed: true,
          consentTimestamp: stamp,
          isAnonymous,
          guestName: values.fullName.trim(),
          guestEmail: values.email.trim(),
          guestPhone: values.phone.trim(),
          guestBookingReason: safeReason,
        }),
      });
      const createJson = (await createRes.json()) as {
        success: boolean;
        data?: { bookingId: string };
        error?: string;
      };
      if (!createRes.ok || !createJson.success || !createJson.data?.bookingId) {
        throw new Error(createJson.error ?? "Could not create booking");
      }
      const bookingId = createJson.data.bookingId;
      setDraft({ ...d, bookingId });

      await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          consentTypes: ["terms", "privacy", "ai_notes"],
        }),
      });

      setPayPhase("initializing");
      const initRes = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          email: values.email.trim(),
          metadata: {
            booking_reason: safeReason ?? "",
          },
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
      setPayError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[375px] space-y-5 px-4 py-4 pb-10">
      <h1 className="text-xl font-semibold">Confirm booking</h1>

      <section className="rounded-xl border p-4">
        <div className="flex gap-3">
          <Image
            src={photo}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-full object-cover"
            unoptimized={remote}
          />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold leading-tight">{draft.therapistName}</p>
            <p className="mt-1 text-muted-foreground">
              {formatWatLongDate(draft.date)}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {formatSlot12hWat(draft.startTime)}
            </p>
            <p className="mt-2 text-sm">
              {draft.sessionDuration} min · {draft.sessionRateFormatted}
            </p>
          </div>
        </div>
        <Link
          href={`/book/${draft.therapistId}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-3 flex min-h-12 w-full items-center justify-center",
          )}
        >
          Change
        </Link>
      </section>

      <form className="space-y-5" onSubmit={form.handleSubmit(onPay)} noValidate>
        <div className="mb-4 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#292612]/10">
                <EyeOff size={18} strokeWidth={1.5} className="text-[#292612]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  Anonymous session
                </p>
                <p className="text-xs text-gray-500">
                  Your real name is never shared with your therapist
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous(!isAnonymous)}
              disabled={busy}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                isAnonymous ? "bg-[#292612]" : "bg-gray-200",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 size-4 rounded-full bg-white transition-transform",
                  isAnonymous ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
          {isAnonymous ? (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <p className="mb-2 text-xs text-gray-500">
                ℹ️ Your therapist will see your chosen alias and a client ID.
                Your real name and contact details are kept private.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-[#292612]">
                <Lock size={12} aria-hidden />
                <span>Your privacy is protected</span>
              </div>
            </div>
          ) : null}
        </div>

        <section className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">Your details</p>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fullName">
                {isAnonymous ? "Choose an alias" : "Full name"}
              </Label>
              <Input
                id="fullName"
                className="min-h-12"
                disabled={busy}
                placeholder={
                  isAnonymous
                    ? "e.g. Alex, Sunshine, or any name you prefer"
                    : undefined
                }
                {...form.register("fullName")}
              />
              {isAnonymous ? (
                <p className="text-xs text-muted-foreground">
                  This is what your therapist will call you
                </p>
              ) : null}
              {form.formState.errors.fullName ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.fullName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className="min-h-12"
                disabled={busy}
                {...form.register("email")}
              />
              {isAnonymous ? (
                <p className="text-xs text-muted-foreground">
                  Used to send your session link only. Never shared with
                  therapist.
                </p>
              ) : null}
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">
                {isAnonymous ? "Phone (optional)" : "Phone (WhatsApp)"}
              </Label>
              <Input
                id="phone"
                type="tel"
                className="min-h-12"
                disabled={busy}
                {...form.register("phone")}
              />
              {isAnonymous ? (
                <p className="text-xs text-muted-foreground">
                  Optional — only used to send your session link
                </p>
              ) : null}
              {form.formState.errors.phone ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.phone.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="bookingReason">
                Reason for booking (optional)
              </Label>
              <select
                id="bookingReason"
                className="flex min-h-12 w-full rounded-lg border border-input bg-background px-3 text-sm"
                disabled={busy}
                {...form.register("bookingReason")}
              >
                <option value="">Select a topic</option>
                {BOOKING_REASON_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <label className="flex gap-3 text-sm leading-snug">
            <input
              type="checkbox"
              checked={consentLegal}
              disabled={busy}
              onChange={(e) => setConsentLegal(e.target.checked)}
              className="mt-1 size-4 shrink-0"
            />
            <span>
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
              .
            </span>
          </label>
          <label className="flex gap-3 text-sm leading-snug">
            <input
              type="checkbox"
              checked={consentAi}
              disabled={busy}
              onChange={(e) => setConsentAi(e.target.checked)}
              className="mt-1 size-4 shrink-0"
            />
            <span>
              I consent to this session being supported by AI-assisted note generation. Session
              audio is processed in real time and permanently deleted. Only clinical notes are
              retained, accessible to my therapist only.{" "}
              <a
                href="/privacy#session-data"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Learn more
              </a>
            </span>
          </label>

          {payError ? (
            <p className="text-sm text-destructive">{payError}</p>
          ) : null}

          <Button
            type="submit"
            className="min-h-12 w-full bg-primary text-primary-foreground"
            disabled={busy || !consentLegal || !consentAi}
          >
            {payPhase === "creating"
              ? "Saving booking…"
              : payPhase === "initializing"
                ? "Opening Paystack…"
                : `Pay ₦${naira.toLocaleString("en-NG")}`}
          </Button>
        </section>
      </form>

      <Link
        href="/book"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "flex min-h-12 w-full items-center justify-center",
        )}
      >
        Back to therapists
      </Link>
    </main>
  );
}
