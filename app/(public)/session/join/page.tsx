"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { SessionJoinPayload } from "@/lib/session/booking-join-payload";
import {
  canJoinSessionWindow,
  minutesUntilSessionStart,
} from "@/lib/session/join-access";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";

const AgoraVideoCall = dynamic(
  () => import("@/components/session/AgoraVideoCall"),
  { ssr: false },
);

type Phase =
  | "loading"
  | "prejoin"
  | "calling"
  | "ending"
  | "done"
  | "error";

type Viewer = "therapist" | "patient" | "guest";

type TokenPayload = {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
};

function JoinSessionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get("bookingId");
  const sessionIdParam = searchParams.get("sessionId");

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SessionJoinPayload | null>(null);
  const [viewer, setViewer] = useState<Viewer>("guest");
  const [checklistReady, setChecklistReady] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [tokenData, setTokenData] = useState<TokenPayload | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [, setNowTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      const role = user?.app_metadata?.role as string | undefined;
      if (role === "therapist") setViewer("therapist");
      else if (role === "patient") setViewer("patient");
      else setViewer("guest");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPayload = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      let res: Response;
      if (bookingIdParam) {
        res = await fetch(`/api/session/${bookingIdParam}`, {
          credentials: "include",
        });
      } else if (sessionIdParam) {
        res = await fetch(`/api/session/from-session/${sessionIdParam}`, {
          credentials: "include",
        });
      } else {
        setError("Missing booking or session link.");
        setPhase("error");
        return;
      }

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: SessionJoinPayload;
      };

      if (!res.ok || !json.success || !json.data) {
        setError(json.error ?? "Session not found.");
        setPhase("error");
        return;
      }

      setPayload(json.data);
      setPhase("prejoin");
    } catch {
      setError("Could not load session.");
      setPhase("error");
    }
  }, [bookingIdParam, sessionIdParam]);

  useEffect(() => {
    void loadPayload();
  }, [loadPayload]);

  const bookingDate = useMemo(() => {
    if (!payload) return null;
    return new Date(payload.date);
  }, [payload]);

  const startIso = useMemo(() => {
    if (!payload || !bookingDate) return null;
    return bookingDateStartToIso(bookingDate, payload.startTime);
  }, [payload, bookingDate]);

  const minutesUntil = useMemo(() => {
    if (!payload || !bookingDate) return null;
    return minutesUntilSessionStart(bookingDate, payload.startTime);
  }, [payload, bookingDate]);

  const inJoinWindow = useMemo(() => {
    if (!payload || !bookingDate) return false;
    return canJoinSessionWindow(
      bookingDate,
      payload.startTime,
      payload.endTime,
    );
  }, [payload, bookingDate]);

  const startLabel = startIso ? formatWAT(startIso) : "";

  const guestEmailOk =
    !payload?.needsGuestEmailForComplete ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());

  const canTapJoin =
    inJoinWindow &&
    guestEmailOk &&
    (payload?.needsGuestEmailForComplete ? guestEmail.trim().length > 0 : true);

  const countdownLabel = useMemo(() => {
    if (minutesUntil == null) return "";
    if (minutesUntil > 10) {
      return `Your session starts in ${minutesUntil} minute${minutesUntil === 1 ? "" : "s"}.`;
    }
    if (minutesUntil >= 0) {
      return "Session is starting now.";
    }
    return "Your session time has started.";
  }, [minutesUntil]);

  async function requestTokenAndCall() {
    if (!payload) return;
    setTokenError(null);
    try {
      const res = await fetch("/api/session/token", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: payload.bookingId }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: TokenPayload;
      };
      if (!res.ok || !json.success || !json.data) {
        setTokenError(json.error ?? "Could not start video.");
        return;
      }
      setTokenData(json.data);
      setPhase("calling");
    } catch {
      setTokenError("Could not start video.");
    }
  }

  async function completeSession(transcript: string) {
    if (!payload) return;
    setPhase("ending");
    try {
      const body: {
        bookingId: string;
        transcript: string;
        guestEmail?: string;
      } = {
        bookingId: payload.bookingId,
        transcript,
      };
      if (payload.needsGuestEmailForComplete) {
        body.guestEmail = guestEmail.trim();
      }
      const res = await fetch("/api/session/complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Failed to complete session.");
        setPhase("error");
        return;
      }
    } catch {
      setError("Failed to complete session.");
      setPhase("error");
      return;
    }

    setTimeout(() => {
      setPhase("done");
    }, 2000);
  }

  useEffect(() => {
    if (phase !== "done" || viewer !== "therapist" || !payload) return;
    const t = setTimeout(() => {
      router.replace(`/therapist/sessions/${payload.sessionId}/post-session`);
    }, 2000);
    return () => clearTimeout(t);
  }, [phase, viewer, payload, router]);

  if (phase === "loading") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 p-4">
        <div
          className="size-10 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4 pt-10">
        <h1 className="text-xl font-semibold">Session unavailable</h1>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex min-h-12 w-full items-center justify-center",
          )}
        >
          Back to home
        </Link>
      </main>
    );
  }

  if (phase === "ending") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
        <div
          className="size-12 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          aria-hidden
        />
        <h1 className="text-lg font-semibold">Generating notes…</h1>
        <p className="text-sm text-muted-foreground">
          Please wait a moment while we save your session.
        </p>
      </main>
    );
  }

  if (phase === "done" && viewer === "therapist") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-lg font-semibold">
          Session complete — notes are being generated
        </h1>
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </main>
    );
  }

  if (phase === "done" && viewer !== "therapist" && payload) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 p-4 pt-10">
        <h1 className="text-xl font-semibold">Session complete</h1>
        <p className="text-sm text-muted-foreground">
          Your therapist will review your notes shortly.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`/sessions/${payload.sessionId}/feedback`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "inline-flex min-h-12 w-full items-center justify-center",
            )}
          >
            Rate your session
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex min-h-12 w-full items-center justify-center",
            )}
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "calling" && tokenData && payload) {
    return (
      <AgoraVideoCall
        appId={tokenData.appId}
        channelName={tokenData.channelName}
        token={tokenData.token}
        uid={tokenData.uid}
        bookingId={payload.bookingId}
        guestEmail={
          payload.needsGuestEmailForComplete ? guestEmail.trim() : null
        }
        onSessionEnd={(t) => void completeSession(t)}
      />
    );
  }

  if (!payload) return null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-6 p-4 pt-6 pb-10">
      <header className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Video session
        </p>
        <h1 className="text-xl font-semibold leading-tight">Join session</h1>
      </header>

      <section className="flex gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted">
          {payload.therapistPhoto ? (
            <Image
              src={payload.therapistPhoto}
              alt=""
              width={80}
              height={80}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center text-lg font-semibold text-muted-foreground">
              {payload.therapistName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium leading-snug">{payload.therapistName}</p>
          <p className="text-sm text-muted-foreground">{startLabel}</p>
          <p className="text-sm text-muted-foreground">{countdownLabel}</p>
        </div>
      </section>

      {payload.needsGuestEmailForComplete ? (
        <div className="space-y-2">
          <Label htmlFor="guest-email">Email used for booking</Label>
          <Input
            id="guest-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="min-h-12"
          />
          <p className="text-xs text-muted-foreground">
            We use this to verify it is your session before saving notes.
          </p>
        </div>
      ) : null}

      {!inJoinWindow ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          Session starts at {startLabel}. You can join from 10 minutes before
          that time.
        </div>
      ) : null}

      {tokenError ? (
        <p className="text-sm text-destructive">{tokenError}</p>
      ) : null}

      {!checklistReady ? (
        <section className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold">Before you join</h2>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Allow camera access when your browser prompts you.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden>•</span>
              <span>Allow microphone access when your browser prompts you.</span>
            </li>
          </ul>
          <Button
            type="button"
            className="min-h-12 w-full"
            disabled={!canTapJoin}
            onClick={() => setChecklistReady(true)}
          >
            Continue
          </Button>
        </section>
      ) : (
        <section className="space-y-3">
          <Button
            type="button"
            className="min-h-12 w-full"
            disabled={!canTapJoin}
            onClick={() => void requestTokenAndCall()}
          >
            I&apos;m ready — join session
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 w-full"
            onClick={() => setChecklistReady(false)}
          >
            Back
          </Button>
        </section>
      )}
    </main>
  );
}

export default function JoinSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center p-4">
          <div
            className="size-10 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
            aria-hidden
          />
        </main>
      }
    >
      <JoinSessionInner />
    </Suspense>
  );
}
