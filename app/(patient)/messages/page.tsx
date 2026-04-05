"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PatientMessagesTab } from "@/components/patient/PatientMessagesTab";

function MessagesInner() {
  const searchParams = useSearchParams();
  const thread = searchParams.get("thread");
  return <PatientMessagesTab initialThreadId={thread} fullPage />;
}

export default function PatientMessagesPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-white">
      <Suspense
        fallback={
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        }
      >
        <MessagesInner />
      </Suspense>
    </main>
  );
}
