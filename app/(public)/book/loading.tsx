import { Skeleton } from "@/components/ui/skeleton";

export default function BookLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-3 p-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-primary/15" />
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex gap-3">
          <Skeleton className="size-[52px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex gap-3">
          <Skeleton className="size-[52px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div className="flex gap-3">
          <Skeleton className="size-[52px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </main>
  );
}
