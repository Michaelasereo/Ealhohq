"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SK } from "@/lib/auth/pending-verify";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function SignInForm({
  title,
  description,
  footer,
}: {
  title: string;
  description: string;
  footer?: ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    setLoading(true);
    const { data, error: signError } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });
    if (signError) {
      const msg = signError.message;
      const lower = msg.toLowerCase();
      if (
        lower.includes("email not confirmed") ||
        lower.includes("not confirmed")
      ) {
        const otpRes = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email.trim(),
            name: values.email.trim().split("@")[0] ?? "there",
            type: "signup",
          }),
        });
        const otpJson = (await otpRes.json()) as {
          success?: boolean;
          error?: string;
        };
        if (!otpJson.success) {
          setError(otpJson.error ?? "Could not send verification code");
          setLoading(false);
          return;
        }
        sessionStorage.setItem(SK.email, values.email.trim());
        sessionStorage.setItem(SK.password, values.password);
        sessionStorage.setItem(SK.name, "");
        sessionStorage.setItem(SK.role, "patient");
        sessionStorage.setItem(SK.flow, "login");
        router.push("/auth/verify");
        setLoading(false);
        return;
      }
      setError(msg);
      setLoading(false);
      return;
    }
    const user = data.user ?? data.session?.user;
    const role = user?.app_metadata?.role as string | undefined;
    const status = user?.app_metadata?.status as string | undefined;

    if (role === "therapist" && status === "rejected") {
      setError("Your application was not approved");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    if (role === "patient") {
      router.replace("/dashboard");
      router.refresh();
      setLoading(false);
      return;
    }
    if (role === "admin") {
      router.replace("/admin/dashboard");
      router.refresh();
      setLoading(false);
      return;
    }
    if (role === "therapist") {
      if (status === "approved") {
        router.replace("/therapist/dashboard");
      } else {
        router.replace("/therapist/pending");
      }
      router.refresh();
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
    setLoading(false);
  };

  return (
    <Card className="w-full border-border bg-white shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="h-12 min-h-[48px] text-base"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="h-12 min-h-[48px] text-base"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
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
                  <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
          {footer != null ? <div className="mt-6">{footer}</div> : null}
        </CardContent>
      </Card>
  );
}
