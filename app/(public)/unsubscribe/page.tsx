"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type UiState = "confirm" | "loading" | "done" | "error";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [state, setState] = useState<UiState>("confirm");

  async function handleUnsubscribe() {
    setState("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setState("done");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <Link href="/" className="mb-8 inline-block">
          <span className="text-xl font-bold text-primary">ealho</span>
        </Link>

        {state === "confirm" && (
          <>
            <h1 className="mb-2 text-lg font-semibold text-gray-900">Unsubscribe</h1>
            <p className="mb-6 text-sm text-gray-500">
              Remove <strong>{email}</strong> from all Ealho emails?
            </p>
            <button
              onClick={() => void handleUnsubscribe()}
              className="mb-3 w-full rounded-xl bg-gray-900 py-3 text-sm font-medium text-white"
              type="button"
            >
              Yes, unsubscribe me
            </button>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">
              Never mind, take me home
            </Link>
          </>
        )}

        {state === "loading" && <p className="text-sm text-gray-500">Unsubscribing...</p>}

        {state === "done" && (
          <>
            <p className="mb-2 text-lg font-semibold text-gray-900">Done.</p>
            <p className="mb-6 text-sm text-gray-500">
              You&apos;ve been removed from our list. No more emails from us.
            </p>
            <p className="mb-4 text-xs text-gray-400">
              Changed your mind? You can always resubscribe from our homepage.
            </p>
            <Link href="/" className="text-sm text-primary underline">
              Back to Ealho
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <p className="mb-4 text-sm text-red-500">
              Something went wrong. Please email us at hello@ealho.com to be removed.
            </p>
            <Link href="/" className="text-sm text-gray-400 underline">
              Back to Ealho
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
