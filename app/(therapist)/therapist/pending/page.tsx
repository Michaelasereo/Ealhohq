"use client";

import { Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function EalhoMark() {
  return (
    <div className="mb-6 flex justify-center">
      <Image
        src="/Ealho-logo.svg"
        alt="Ealho"
        width={138}
        height={50}
        priority
        className="h-10 w-auto sm:h-11"
        style={{ width: "auto", height: "auto" }}
      />
    </div>
  );
}

export default function TherapistPendingPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<{
    name: string;
    email: string;
    specializations: string[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u || cancelled) return;
      const status = u.app_metadata?.status as string | undefined;
      if (status === "approved") {
        router.replace("/therapist/dashboard");
        return;
      }
      if (status === "rejected") {
        router.replace("/therapist/login");
        return;
      }
      const meta = u.user_metadata as Record<string, unknown> | undefined;
      const name =
        (typeof meta?.full_name === "string" && meta.full_name) ||
        u.email?.split("@")[0] ||
        "";
      const specs =
        (Array.isArray(meta?.specializations) && meta.specializations) ||
        [];
      setSummary({
        name: String(name),
        email: u.email ?? "",
        specializations: specs.map(String),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/therapist/login");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <EalhoMark />
      <Card>
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#292612]/10">
            <Clock className="size-10 text-[#292612]" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-xl">Application under review</CardTitle>
          <CardDescription className="text-base">
            Thank you for applying to join Ealho Therapy. Our team reviews all
            applications within 48 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {summary ? (
            <div className="rounded-lg border bg-muted/40 p-3 text-left text-foreground">
              <p>
                <span className="font-medium">Name:</span> {summary.name}
              </p>
              <p>
                <span className="font-medium">Email:</span> {summary.email}
              </p>
              {summary.specializations.length > 0 ? (
                <p>
                  <span className="font-medium">Focus areas:</span>{" "}
                  {summary.specializations.join(", ")}
                </p>
              ) : null}
            </div>
          ) : (
            <Skeleton className="h-20 w-full" />
          )}
          <p>
            We&apos;ll notify you by email once your application is reviewed.
          </p>
          <p>
            Questions?{" "}
            <a
              className="font-medium text-primary underline"
              href="mailto:hello@ealho.com"
            >
              hello@ealho.com
            </a>
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex min-h-12 w-full items-center justify-center sm:w-auto",
              )}
            >
              Back to home
            </Link>
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full sm:w-auto"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
