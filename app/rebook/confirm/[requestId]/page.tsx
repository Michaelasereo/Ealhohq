import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { RebookConfirmClient } from "./RebookConfirmClient";

export default async function RebookConfirmPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md p-4">
          <Skeleton className="h-40 w-full" />
        </main>
      }
    >
      <RebookConfirmClient requestId={requestId} />
    </Suspense>
  );
}
