import { Skeleton } from "@/components/ui/skeleton";

export default function BookTherapistLoading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-4 p-4">
      <Skeleton className="h-8 w-3/4 animate-pulse rounded-lg bg-primary/15" />
      <Skeleton className="h-40 w-full animate-pulse rounded-xl bg-primary/10" />
      <Skeleton className="h-64 w-full animate-pulse rounded-xl bg-primary/10" />
    </main>
  );
}
