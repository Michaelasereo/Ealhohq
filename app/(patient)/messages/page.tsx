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
    <div className="w-full max-w-5xl bg-white px-4 pb-24 pt-4 md:mx-auto md:px-6 md:pb-8 md:pt-6">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading…</p>
        }
      >
        <MessagesInner />
      </Suspense>
    </div>
  );
}
