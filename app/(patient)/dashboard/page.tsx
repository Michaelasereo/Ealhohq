"use client";

import { Suspense } from "react";

import { PatientDashboardHome } from "@/components/patient/PatientDashboardHome";
import { Skeleton } from "@/components/ui/skeleton";

function Fallback() {
  return (
    <main className="mx-auto w-full max-w-lg space-y-6 p-4 pb-24 md:pb-8">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </main>
  );
}

export default function PatientDashboardPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <PatientDashboardHome />
    </Suspense>
  );
}
