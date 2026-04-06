"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { cn } from "@/lib/utils";

type DiscountRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  bookingUseCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

async function fetchDiscounts(): Promise<DiscountRow[]> {
  const res = await fetch("/api/admin/discounts", { credentials: "include" });
  const j = (await res.json()) as {
    success?: boolean;
    data?: DiscountRow[];
    error?: string;
  };
  if (!res.ok || !j.data) throw new Error(j.error ?? "Failed to load");
  return j.data;
}

function formatType(t: string, v: number) {
  if (t === "full") return "100% off";
  if (t === "percentage") return `${v}%`;
  return `₦${v.toLocaleString("en-NG")}`;
}

export default function AdminDiscountsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<
    "percentage" | "fixed" | "full"
  >("full");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [formError, setFormError] = useState("");

  const listQ = useQuery({
    queryKey: ["admin-discounts"],
    queryFn: fetchDiscounts,
  });

  const createM = useMutation({
    mutationFn: async () => {
      setFormError("");
      const rawVal = discountValue.trim()
        ? Number(discountValue.replace(/,/g, ""))
        : undefined;
      const body: Record<string, unknown> = {
        code: code.trim(),
        discountType,
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        expiresDate: expiresDate.trim() || null,
        isActive: true,
      };
      if (discountType !== "full") {
        body.discountValue = rawVal;
      }
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Create failed");
    },
    onSuccess: () => {
      setShowCreate(false);
      setCode("");
      setDiscountType("full");
      setDiscountValue("");
      setMaxUses("");
      setExpiresDate("");
      void qc.invalidateQueries({ queryKey: ["admin-discounts"] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const toggleM = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Update failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-discounts"] });
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Delete failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-discounts"] });
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Discount codes
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage session checkout codes. Stored uppercase; unlimited
            uses when max is empty.
          </p>
        </div>
        <Button
          className="h-12 min-h-[48px] shrink-0 bg-primary"
          onClick={() => setShowCreate((s) => !s)}
        >
          <Plus className="mr-2 size-4" strokeWidth={1.5} />
          {showCreate ? "Close form" : "Create code"}
        </Button>
      </div>

      {showCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="size-5" strokeWidth={1.5} />
              New discount code
            </CardTitle>
            <CardDescription>
              Full = 100% off session. Percentage and fixed apply to the list
              price before Paystack.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dc-code">Code</Label>
                <Input
                  id="dc-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="SUMMER2026"
                  className="font-mono uppercase tracking-widest"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dc-type">Type</Label>
                <select
                  id="dc-type"
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(
                      e.target.value as "percentage" | "fixed" | "full",
                    )
                  }
                  className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <option value="full">Full (100% off)</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed (NGN)</option>
                </select>
              </div>
            </div>
            {discountType !== "full" ? (
              <div className="space-y-2">
                <Label htmlFor="dc-val">
                  {discountType === "percentage" ? "Percent off" : "Amount (NGN)"}
                </Label>
                <Input
                  id="dc-val"
                  type="number"
                  min={0}
                  step={discountType === "percentage" ? 1 : 100}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dc-max">Max uses (empty = unlimited)</Label>
                <Input
                  id="dc-max"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dc-exp">Expiry date (optional)</Label>
                <Input
                  id="dc-exp"
                  type="date"
                  value={expiresDate}
                  onChange={(e) => setExpiresDate(e.target.value)}
                />
              </div>
            </div>
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button
              type="button"
              className="bg-primary"
              disabled={createM.isPending || !code.trim()}
              onClick={() => createM.mutate()}
            >
              {createM.isPending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
              ) : (
                "Save code"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All codes</CardTitle>
          <CardDescription>
            Toggle to pause a code without deleting history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (listQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No codes yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 font-medium">Code</th>
                    <th className="p-3 font-medium">Type / value</th>
                    <th className="p-3 font-medium">Uses</th>
                    <th className="p-3 font-medium">Expires</th>
                    <th className="p-3 font-medium">Active</th>
                    <th className="p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listQ.data!.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-3 font-mono text-xs font-semibold">
                        {row.code}
                      </td>
                      <td className="p-3">
                        {formatType(row.discountType, row.discountValue)}
                      </td>
                      <td className="p-3 tabular-nums text-muted-foreground">
                        {row.usedCount}
                        {row.maxUses != null ? ` / ${row.maxUses}` : " / ∞"}
                        <span className="ml-1 text-xs">
                          ({row.bookingUseCount} bookings)
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {row.expiresAt
                          ? new Date(row.expiresAt).toLocaleDateString("en-NG")
                          : "—"}
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant={row.isActive ? "secondary" : "outline"}
                          disabled={toggleM.isPending}
                          onClick={() =>
                            toggleM.mutate({
                              id: row.id,
                              isActive: !row.isActive,
                            })
                          }
                        >
                          {row.isActive ? "On" : "Off"}
                        </Button>
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteM.isPending}
                          onClick={() => {
                            if (
                              typeof window !== "undefined" &&
                              !window.confirm(
                                `Delete code ${row.code}? This cannot be undone.`,
                              )
                            ) {
                              return;
                            }
                            deleteM.mutate(row.id);
                          }}
                        >
                          <Trash2 className="size-4" strokeWidth={1.5} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
