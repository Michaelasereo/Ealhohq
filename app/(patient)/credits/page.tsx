"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CREDIT_PACKAGES } from "@/lib/credits/packages";
import type { CreditPackageKey } from "@/lib/credits/purchase-config";
import { tierFromBalance } from "@/lib/credits/purchase-config";
import { cn } from "@/lib/utils";

const TIER_CLASS: Record<string, string> = {
  bronze: "border-orange-200 bg-orange-50 text-orange-900",
  silver: "border-slate-200 bg-slate-100 text-slate-800",
  gold: "border-amber-200 bg-amber-50 text-amber-900",
  platinum: "border-violet-200 bg-violet-50 text-violet-900",
};

function pkgKey(name: string): CreditPackageKey {
  return name.toLowerCase() as CreditPackageKey;
}

export default function CreditsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-credits-summary"],
    queryFn: async () => {
      const r = await fetch("/api/patient/credits", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { balance: number; tier: string };
        error?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      return j.data!;
    },
  });

  const purchaseMut = useMutation({
    mutationFn: async (pkg: CreditPackageKey) => {
      const r = await fetch("/api/credits/purchase", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { authorization_url?: string };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.authorization_url) {
        throw new Error(j.error ?? "Could not start payment");
      }
      window.location.href = j.data.authorization_url;
    },
  });

  const credits = data;
  const displayTier = credits
    ? tierFromBalance(credits.balance)
    : "bronze";

  return (
    <div className="mx-auto max-w-2xl p-6 pb-24 md:pb-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Credits</h1>

      <div className="mb-6 rounded-2xl bg-primary p-6 text-primary-foreground">
        <p className="mb-1 text-sm text-primary-foreground/80">Current balance</p>
        <p className="mb-2 text-4xl font-bold tabular-nums">
          {isLoading ? "…" : (credits?.balance ?? 0)}
          <span className="ml-2 text-lg font-normal text-primary-foreground/80">
            credits
          </span>
        </p>
        <span
          className={cn(
            "inline-block rounded-full border px-2 py-1 text-xs font-medium capitalize",
            TIER_CLASS[displayTier] ?? TIER_CLASS.bronze,
          )}
        >
          {displayTier} tier
        </span>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-foreground">Buy credits</h2>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.name}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-foreground">{pkg.name}</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                Save {pkg.save}
              </span>
            </div>
            <p className="mb-0.5 text-2xl font-bold text-foreground">
              {pkg.sessions} sessions
            </p>
            <p className="mb-4 text-sm text-muted-foreground">{pkg.price}</p>
            <Button
              type="button"
              className="h-12 w-full bg-primary text-primary-foreground"
              disabled={purchaseMut.isPending}
              onClick={() => purchaseMut.mutate(pkgKey(pkg.name))}
            >
              {purchaseMut.isPending ? "Opening…" : "Buy now"}
            </Button>
          </div>
        ))}
      </div>

      {purchaseMut.isError ? (
        <p className="mb-4 text-sm text-destructive">
          {purchaseMut.error instanceof Error
            ? purchaseMut.error.message
            : "Payment could not start"}
        </p>
      ) : null}

      <h2 className="mb-4 text-lg font-semibold text-foreground">
        Transaction history
      </h2>
      <CreditTransactions />
    </div>
  );
}

function CreditTransactions() {
  const { data, isLoading } = useQuery({
    queryKey: ["credit-transactions"],
    queryFn: async () => {
      const r = await fetch("/api/patient/credits/transactions", {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: {
          id: string;
          type: string;
          amount: number;
          createdAt: string;
        }[];
        error?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Failed");
      return j.data ?? [];
    },
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }

  const transactions = data ?? [];

  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No transactions yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
        >
          <div>
            <p className="text-sm font-medium capitalize text-foreground">
              {t.type}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(t.createdAt).toLocaleDateString("en-NG", {
                timeZone: "Africa/Lagos",
              })}
            </p>
          </div>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              t.amount > 0 ? "text-emerald-600" : "text-red-600",
            )}
          >
            {t.amount > 0 ? "+" : ""}
            {t.amount} credits
          </span>
        </div>
      ))}
    </div>
  );
}
