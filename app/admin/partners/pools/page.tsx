"use client";

import { Coins, Loader2 } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  PartnerWorkspaceError,
  PartnerWorkspaceLoading,
} from "@/components/admin/PartnerWorkspaceLoadStates";
import { PartnerWorkspaceShell } from "@/components/admin/PartnerWorkspaceShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { watCurrentMonthYm } from "@/lib/wat-datetime";

type PartnerRow = {
  id: string;
  name: string;
  referralSlug: string;
  monthlyPoolSize: number;
  status: string;
};

export default function PartnerCreditPoolsPage() {
  const qc = useQueryClient();
  const defaultMonth = watCurrentMonthYm();

  const partnersQ = useQuery({
    queryKey: ["admin-super-referral-partners"],
    queryFn: async (): Promise<PartnerRow[]> => {
      const r = await fetch("/api/admin/super-referral-partners", {
        credentials: "include",
      });
      const j = (await r.json()) as { success?: boolean; data?: PartnerRow[] };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed to load partners");
      return j.data;
    },
  });

  if (partnersQ.isLoading) {
    return <PartnerWorkspaceLoading />;
  }

  if (partnersQ.isError) {
    return (
      <PartnerWorkspaceError
        message={
          partnersQ.error instanceof Error
            ? partnersQ.error.message
            : "Failed to load partners"
        }
      />
    );
  }

  return (
    <PartnerWorkspaceShell>
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Coins size={22} aria-hidden />
          Credit pools
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Approve each calendar month so staff receive one covered session. The monthly cron
          (1st, WAT) refreshes credits when an approved allocation exists for that month.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approve pool for a month</CardTitle>
          <CardDescription>
            Grants <strong>1</strong> credit to each active onboarded staff member for the
            selected month (YYYY-MM, West Africa Time).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(partnersQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No partners yet. Add an organisation under Partners first.
            </p>
          ) : null}
          {(partnersQ.data ?? []).map((p) => (
            <ApproveRow
              key={p.id}
              partner={p}
              defaultMonth={defaultMonth}
              onDone={() => {
                void qc.invalidateQueries({ queryKey: ["admin-super-referral-partners"] });
              }}
            />
          ))}
        </CardContent>
      </Card>
    </PartnerWorkspaceShell>
  );
}

function ApproveRow({
  partner,
  defaultMonth,
  onDone,
}: {
  partner: PartnerRow;
  defaultMonth: string;
  onDone: () => void;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [msg, setMsg] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch(
        `/api/admin/super-referral-partners/${partner.id}/approve-pool`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ month: month.trim() }),
        },
      );
      const j = (await r.json()) as { success?: boolean; error?: unknown; data?: unknown };
      if (!r.ok || !j.success) throw new Error("Approve failed");
      return j.data;
    },
    onSuccess: (data) => {
      setMsg(JSON.stringify(data));
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{partner.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{partner.referralSlug}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`m-${partner.id}`}>Month</Label>
        <Input
          id={`m-${partner.id}`}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-11 w-36 font-mono text-sm"
          placeholder="2026-04"
        />
      </div>
      <Button
        type="button"
        className="h-11 shrink-0"
        disabled={mut.isPending || !/^\d{4}-\d{2}$/.test(month.trim())}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Approve pool"
        )}
      </Button>
      {msg ? (
        <p className="text-xs text-muted-foreground sm:col-span-full">{msg}</p>
      ) : null}
    </div>
  );
}
