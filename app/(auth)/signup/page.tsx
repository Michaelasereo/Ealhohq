"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SK } from "@/lib/auth/pending-verify";

const signupSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((v) => /\d/.test(v), "Password must contain a number"),
    confirmPassword: z.string(),
    phone: z.string().min(10, "Phone must be at least 10 characters"),
    agreeLegal: z.boolean().refine((v) => v === true, {
      message: "You must agree to the Privacy Policy and Terms of Service",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [guestFound, setGuestFound] = useState<{
    sessionCount: number;
    therapistName: string;
    lastSessionDate: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      agreeLegal: false,
    },
  });

  useEffect(() => {
    const e = searchParams.get("email")?.trim();
    if (e) setValue("email", e);
  }, [searchParams, setValue]);

  async function checkGuestEmail(email: string) {
    if (!email || !email.includes("@")) return;
    setIsCheckingEmail(true);
    try {
      const res = await fetch(
        `/api/auth/check-guest-email?email=${encodeURIComponent(email)}`,
      );
      const data = (await res.json()) as {
        found?: boolean;
        sessionCount?: number;
        therapistName?: string;
        lastSessionDate?: string;
      };
      if (data.found && data.therapistName) {
        setGuestFound({
          sessionCount: data.sessionCount ?? 0,
          therapistName: data.therapistName,
          lastSessionDate: data.lastSessionDate ?? "",
        });
      } else {
        setGuestFound(null);
      }
    } catch {
      setGuestFound(null);
    } finally {
      setIsCheckingEmail(false);
    }
  }

  const emailField = register("email");

  const onSubmit = async (values: SignupForm) => {
    setError(null);
    setLoading(true);

    const email = values.email.trim();
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name: values.fullName.trim(),
        type: "signup",
      }),
    });

    const json = (await res.json()) as { success?: boolean; error?: string };

    if (!json.success) {
      setError(json.error ?? "Could not send verification code");
      setLoading(false);
      return;
    }

    sessionStorage.setItem(SK.email, email);
    sessionStorage.setItem(SK.name, values.fullName.trim());
    sessionStorage.setItem(SK.password, values.password);
    sessionStorage.setItem(SK.role, "patient");
    sessionStorage.setItem(SK.phone, values.phone.trim());
    sessionStorage.setItem(SK.flow, "signup");
    sessionStorage.setItem(
      SK.consentTypes,
      JSON.stringify(["terms", "privacy"]),
    );

    router.replace("/auth/verify");
    router.refresh();
    setLoading(false);
  };

  return (
    <Card className="w-full border-border bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Client registration for Ealho Therapy</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                autoComplete="name"
                className="h-12 min-h-[48px] text-base"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="h-12 min-h-[48px] text-base"
                {...emailField}
                onBlur={(e) => {
                  emailField.onBlur(e);
                  void checkGuestEmail(e.target.value);
                }}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
              {isCheckingEmail && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="inline-block size-3 animate-spin rounded-full border border-gray-300 border-t-gray-600" />
                  Checking for existing sessions...
                </p>
              )}
              {guestFound && (
                <div className="mt-2 flex items-start gap-3 rounded-xl border border-[#2C3B2D]/20 bg-[#2C3B2D]/5 px-4 py-3">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2C3B2D]/15">
                    <Link2 size={11} strokeWidth={2} className="text-[#2C3B2D]" />
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs font-semibold text-[#2C3B2D]">
                      We found your session
                    </p>
                    <p className="text-xs text-gray-600">
                      You booked a session with {guestFound.therapistName}. Create your
                      account to manage it, view your notes history, and rebook easily.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                className="h-12 min-h-[48px] text-base"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="h-12 min-h-[48px] text-base"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                className="h-12 min-h-[48px] text-base"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <label className="flex gap-3 text-sm leading-snug">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0"
                {...register("agreeLegal")}
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
            {errors.agreeLegal && (
              <p className="text-sm text-destructive">{errors.agreeLegal.message}</p>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 min-h-[48px] w-full bg-primary text-base text-primary-foreground hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Sending code…
                </>
              ) : (
                "Sign up"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="cursor-pointer font-medium text-primary underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full border-border bg-white shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
