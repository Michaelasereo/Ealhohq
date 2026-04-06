"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Step = "verify" | "password" | "done";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/\d/, "Must contain a number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export function SetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") ?? "").trim();
  const codeFromUrl = (searchParams.get("code") ?? "").trim();
  const roleParam = (searchParams.get("role") ?? "patient").toLowerCase();
  const role = roleParam === "therapist" ? "therapist" : "patient";

  const [step, setStep] = useState<Step>("verify");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [verifiedCode, setVerifiedCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [consentTermsPrivacy, setConsentTermsPrivacy] = useState(false);
  const [consentTherapistStandards, setConsentTherapistStandards] = useState(false);
  const [consentInfoAccurate, setConsentInfoAccurate] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    if (codeFromUrl.length === 6 && /^\d{6}$/.test(codeFromUrl)) {
      setDigits(codeFromUrl.split(""));
    }
  }, [codeFromUrl]);

  const code = digits.join("");

  const onVerify = async () => {
    if (code.length !== 6 || !email) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/verify-invite-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const json = (await res.json()) as { success?: boolean; error?: string };
    setLoading(false);
    if (!res.ok || !json.success) {
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      setError(json.error ?? "Invalid code");
      return;
    }
    setVerifiedCode(code);
    setStep("password");
  };

  const onDigitChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (t.length === 6) {
      setDigits(t.split(""));
      inputsRef.current[5]?.focus();
    }
  };

  const onPasswordSubmit = useCallback(
    async (values: PasswordForm) => {
      if (!email || !verifiedCode) return;
      if (!consentTermsPrivacy) {
        setError("Please confirm you have read and agree to the Privacy Policy and Terms of Service.");
        return;
      }
      if (role === "therapist") {
        if (!consentTherapistStandards || !consentInfoAccurate) {
          setError(
            "Please confirm the Therapist Standards and that your profile information is accurate.",
          );
          return;
        }
      }
      setError(null);
      setLoading(true);
      const res = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: verifiedCode,
          password: values.password,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setLoading(false);
        setError(json.error ?? "Could not set password");
        return;
      }

      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });
      if (signErr) {
        setLoading(false);
        setError(signErr.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const consentTypes =
          role === "therapist"
            ? (["terms", "privacy", "therapist_standards", "accuracy"] as const)
            : (["terms", "privacy"] as const);
        await fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, consentTypes: [...consentTypes] }),
        });
      }

      setStep("done");
      setLoading(false);
      window.setTimeout(() => {
        if (role === "therapist") {
          router.replace("/therapist/dashboard");
        } else {
          router.replace("/dashboard");
        }
        router.refresh();
      }, 2000);
    },
    [
      email,
      verifiedCode,
      role,
      router,
      consentTermsPrivacy,
      consentTherapistStandards,
      consentInfoAccurate,
    ],
  );

  if (!email) {
    return (
      <Card className="w-full border-border bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Invalid link</CardTitle>
          <CardDescription>
            Open the setup link from your invitation email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
          >
            Back to log in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-border bg-white shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {step === "verify" && "Verify your account"}
            {step === "password" && "Set your password"}
            {step === "done" && "Account ready!"}
          </CardTitle>
          <CardDescription>
            {step === "verify" && "Enter your verification code"}
            {step === "password" && "Choose a secure password for your account"}
            {step === "done" && "Redirecting…"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              readOnly
              value={email}
              className="h-12 bg-muted/50 text-muted-foreground"
            />
          </div>

          {step === "verify" ? (
            <>
              <div className="space-y-2">
                <Label>Verification code</Label>
                <div className="flex justify-center gap-2" onPaste={onPaste}>
                  {digits.map((d, i) => (
                    <Input
                      key={i}
                      ref={(el) => {
                        inputsRef.current[i] = el;
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={d}
                      onChange={(e) => onDigitChange(i, e.target.value)}
                      onKeyDown={(e) => onKeyDown(i, e)}
                      className="h-12 w-11 min-h-[48px] min-w-[44px] text-center text-lg"
                    />
                  ))}
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="button"
                onClick={onVerify}
                disabled={loading || code.length !== 6}
                className="h-12 min-h-[48px] w-full bg-primary text-base text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify code"
                )}
              </Button>
            </>
          ) : null}

          {step === "password" ? (
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <label className="flex gap-3 text-sm leading-snug">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0"
                    checked={consentTermsPrivacy}
                    onChange={(e) => setConsentTermsPrivacy(e.target.checked)}
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
                  </span>
                </label>
                {role === "therapist" ? (
                  <>
                    <label className="flex gap-3 text-sm leading-snug">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0"
                        checked={consentTherapistStandards}
                        onChange={(e) =>
                          setConsentTherapistStandards(e.target.checked)
                        }
                      />
                      <span>
                        I agree to the{" "}
                        <a
                          href="/therapist-standards"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Therapist Standards
                        </a>
                      </span>
                    </label>
                    <label className="flex gap-3 text-sm leading-snug">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0"
                        checked={consentInfoAccurate}
                        onChange={(e) =>
                          setConsentInfoAccurate(e.target.checked)
                        }
                      />
                      <span>
                        I confirm that the information I provide is accurate to the best of my
                        knowledge.
                      </span>
                    </label>
                  </>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="h-12 min-h-[48px] text-base"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  className="h-12 min-h-[48px] text-base"
                  {...register("confirm")}
                />
                {errors.confirm && (
                  <p className="text-sm text-destructive">
                    {errors.confirm.message}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={
                  loading ||
                  !consentTermsPrivacy ||
                  (role === "therapist" &&
                    (!consentTherapistStandards || !consentInfoAccurate))
                }
                className="h-12 min-h-[48px] w-full bg-primary text-base text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Set password & continue"
                )}
              </Button>
            </form>
          ) : null}

          {step === "done" ? (
            <p className="text-center text-sm text-muted-foreground">
              You&apos;re all set. Taking you to your dashboard…
            </p>
          ) : null}

          <p className="text-center text-sm">
            <Link href="/login" className="text-primary underline">
              Back to log in
            </Link>
          </p>
        </CardContent>
      </Card>
  );
}
