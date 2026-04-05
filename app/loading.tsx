import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f6faf7]">
      <div className="mx-auto w-full max-w-md space-y-4 p-4">
        <Skeleton className="h-9 w-48 animate-pulse rounded-lg bg-primary/15" />
        <Skeleton className="h-32 w-full animate-pulse rounded-2xl bg-primary/10" />
        <Skeleton className="h-24 w-full animate-pulse rounded-xl bg-primary/10" />
        <Skeleton className="h-24 w-full animate-pulse rounded-xl bg-primary/10" />
      </div>
    </main>
  );
}
