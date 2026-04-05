"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const isDev = process.env.NODE_ENV === "development";
const sentryEnabled = Boolean(process.env.SENTRY_DSN);

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (sentryEnabled) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-[#fafafa] p-6 text-center">
      <h1 className="text-2xl font-semibold text-primary">
        Something went wrong
      </h1>
      {isDev ? (
        <pre className="mt-4 max-h-40 w-full overflow-auto rounded-lg border border-red-200 bg-red-50 p-3 text-left text-xs text-red-900">
          {error.message}
        </pre>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Please try again or return home.
        </p>
      )}
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={reset}
          className={cn(
            buttonVariants({ variant: "default" }),
            "min-h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          Try again
        </button>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "min-h-12 w-full",
          )}
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
