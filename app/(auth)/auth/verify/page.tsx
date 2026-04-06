"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SK, type PendingVerifyFlow } from "@/lib/auth/pending-verify";
import { cn } from "@/lib/utils";
import { useBookingStore } from "@/stores/bookingStore";

export default function AuthVerifyPage() {
  const router = useRouter();
  const resetTherapistEnroll = useBookingStore((s) => s.resetTherapistEnroll);

  const [email, setEmail] = useState("");
  const [mounted, setMounted] = useState(false);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);
  const [resentFlash, setResentFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const performingRef = useRef(false);
  const lastAutoCodeRef = useRef("");

  useEffect(() => {
    setMounted(true);
    const em = sessionStorage.getItem(SK.email);
    if (!em?.trim()) {
      router.replace("/signup");
      return;
    }
    setEmail(em);
  }, [router]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setInterval(() => {
      setResendSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [resendSeconds]);

  const code = digits.join("");

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const clearPendingKeys = () => {
    sessionStorage.removeItem(SK.email);
    sessionStorage.removeItem(SK.name);
    sessionStorage.removeItem(SK.password);
    sessionStorage.removeItem(SK.role);
    sessionStorage.removeItem(SK.phone);
    sessionStorage.removeItem(SK.flow);
    sessionStorage.removeItem(SK.consentTypes);
  };

  const performVerify = useCallback(async () => {
    if (code.length !== 6 || !email) return;
    if (performingRef.current) return;
    performingRef.current = true;
    setError(null);
    setLoading(true);

    const password = sessionStorage.getItem(SK.password);
    const name = sessionStorage.getItem(SK.name) ?? "";
    const role = sessionStorage.getItem(SK.role) ?? "patient";
    const phone = sessionStorage.getItem(SK.phone) ?? "";
    const flow = (sessionStorage.getItem(SK.flow) as PendingVerifyFlow) || "signup";

    if (!password) {
      setLoading(false);
      performingRef.current = false;
      setError("Session expired. Please start again from sign up or log in.");
      return;
    }

    let consentTypes: string[] = [];
    try {
      const raw = sessionStorage.getItem(SK.consentTypes);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          consentTypes = parsed.filter((x) => typeof x === "string");
        }
      }
    } catch {
      consentTypes = [];
    }

    const completeRes = await fetch("/api/auth/complete-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code,
        flow,
        password,
        name,
        role,
        phone,
        consentTypes,
      }),
    });

    const completeJson = (await completeRes.json()) as {
      success?: boolean;
      error?: string;
      attemptsLeft?: number;
    };

    if (!completeJson.success) {
      setLoading(false);
      performingRef.current = false;
      triggerShake();
      setDigits(["", "", "", "", "", ""]);
      lastAutoCodeRef.current = "";
      inputsRef.current[0]?.focus();
      const extra =
        typeof completeJson.attemptsLeft === "number"
          ? ` (${completeJson.attemptsLeft} attempt${completeJson.attemptsLeft === 1 ? "" : "s"} left)`
          : "";
      setError((completeJson.error ?? "Invalid code") + extra);
      return;
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    const { data: signInData, error: signInErr } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInErr) {
      setLoading(false);
      performingRef.current = false;
      setError(signInErr.message);
      return;
    }

    if (role === "therapist" && flow === "signup") {
      const draft = useBookingStore.getState().therapistEnroll;
      if (
        !draft?.consentTermsPrivacy ||
        !draft?.consentTherapistStandards ||
        !draft?.consentInfoAccurate
      ) {
        setLoading(false);
        performingRef.current = false;
        setError(
          "Enrollment data was lost. Close this tab and complete therapist enrollment again from step 1.",
        );
        return;
      }
      const reg = await fetch("/api/therapist/complete-registration", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: draft.fullName,
          phone: draft.phone,
          bio: draft.bio,
          specializations: draft.specializations,
          qualifications: draft.qualifications,
          profilePhotoBase64: draft.profilePhotoBase64 ?? null,
        }),
      });
      const regJson = (await reg.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!reg.ok) {
        setLoading(false);
        performingRef.current = false;
        setError(
          regJson.error ??
            "Could not save your therapist application. Please try again or contact support.",
        );
        return;
      }
      resetTherapistEnroll();
    }

    clearPendingKeys();

    const r = signInData.session?.user?.app_metadata?.role as string | undefined;
    const st = signInData.session?.user?.app_metadata?.status as string | undefined;

    if (flow === "login") {
      if (r === "therapist") {
        router.replace(st === "approved" ? "/therapist/dashboard" : "/therapist/pending");
      } else if (r === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }
    } else if (r === "therapist") {
      router.replace("/therapist/pending");
    } else if (r === "admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/dashboard");
    }
    router.refresh();
    setLoading(false);
    performingRef.current = false;
  }, [code, email, resetTherapistEnroll, router]);

  useEffect(() => {
    if (code.length < 6) {
      lastAutoCodeRef.current = "";
    }
  }, [code]);

  useEffect(() => {
    if (!mounted || code.length !== 6 || loading) return;
    if (lastAutoCodeRef.current === code) return;
    lastAutoCodeRef.current = code;
    void performVerify();
  }, [code, mounted, loading, performVerify]);

  const handleDigit = useCallback(
    (index: number, value: string) => {
      const v = value.replace(/\D/g, "").slice(-1);
      setDigits((prev) => {
        const next = [...prev];
        next[index] = v;
        return next;
      });
      if (v && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    },
    [],
  );

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const arr = text.split("").concat(Array(6).fill("")).slice(0, 6);
    setDigits(arr);
    const nextIndex = Math.min(text.length, 5);
    inputsRef.current[nextIndex]?.focus();
  };

  const resend = async () => {
    if (!email || resendSeconds > 0) return;
    setResendLoading(true);
    setError(null);
    const name = sessionStorage.getItem(SK.name) ?? email.split("@")[0];
    const r = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name,
        type: "signup",
      }),
    });
    const j = (await r.json()) as { success?: boolean; error?: string };
    setResendLoading(false);
    if (!j.success) {
      setError(j.error ?? "Could not resend");
      return;
    }
    setResendSeconds(60);
    setResentFlash(true);
    setTimeout(() => setResentFlash(false), 3000);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lastAutoCodeRef.current = "";
    void performVerify();
  };

  if (!mounted || !email) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-12 text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <Card className="w-full border-border bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Verification code</Label>
              <motion.div
                animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.45 }}
                className="flex justify-center gap-2"
                onPaste={onPaste}
              >
                {digits.map((d, i) => (
                  <Input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    className={cn(
                      "h-16 min-h-[64px] w-12 min-w-[48px] max-w-[48px] border-2 px-0 text-center text-xl font-semibold",
                      d ? "border-primary" : "border-muted-foreground/30",
                    )}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </motion.div>
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </motion.p>
            )}
            {resentFlash && (
              <p className="text-center text-sm text-primary">
                Code resent! Check your email ✓
              </p>
            )}
            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="h-12 min-h-[48px] w-full bg-primary text-base text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
                  Verifying…
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </form>
          <div className="mt-6 space-y-3 text-center text-sm">
            <Button
              type="button"
              variant="outline"
              disabled={resendSeconds > 0 || resendLoading || !email}
              onClick={() => void resend()}
              className="h-12 min-h-[48px] w-full"
            >
              {resendLoading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : resendSeconds > 0 ? (
                `Resend in ${resendSeconds}s`
              ) : (
                "Resend code"
              )}
            </Button>
            <p>
              <Link href="/signup" className="cursor-pointer text-primary underline">
                Wrong email?
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
  );
}
