import { Suspense } from "react";

import { PaymentSuccessClient } from "@/components/booking/PaymentSuccessClient";
import { Skeleton } from "@/components/ui/skeleton";

function SuccessFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[375px] items-center justify-center px-4">
      <Skeleton className="h-12 w-48" />
    </main>
  );
}

export default function PatientBookingSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <PaymentSuccessClient
        signupHref="/signup"
        bookAgainHref="/dashboard/book"
      />
    </Suspense>
  );
}
