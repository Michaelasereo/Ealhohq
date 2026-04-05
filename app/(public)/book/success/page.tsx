import { Suspense } from "react";

import { BookSuccessOverlay } from "@/components/booking/BookSuccessOverlay";
import { Skeleton } from "@/components/ui/skeleton";

function SuccessFallback() {
  return (
    <div className="relative min-h-screen bg-[#FAF8F5]">
      <div className="fixed inset-0 z-10 flex items-center justify-center p-4">
        <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <BookSuccessOverlay />
    </Suspense>
  );
}
