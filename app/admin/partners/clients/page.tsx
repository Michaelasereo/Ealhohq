"use client";

import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
import { cn } from "@/lib/utils";

type PartnerOption = { id: string; name: string; referralSlug: string };

export default function PartnerClientsPage() {
  const [partnerId, setPartnerId] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const partnersQ = useQuery({
    queryKey: ["admin-super-referral-partners"],
    queryFn: async (): Promise<PartnerOption[]> => {
      const r = await fetch("/api/admin/super-referral-partners", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { id: string; name: string; referralSlug: string }[];
      };
      if (!r.ok || !j.success || !j.data) throw new Error("Failed to load partners");
      return j.data.map((p) => ({ id: p.id, name: p.name, referralSlug: p.referralSlug }));
    },
  });

  if (partnersQ.isLoading) {
    return <PartnerWorkspaceLoading />;
  }

  if (partnersQ.isError) {
    return (
      <PartnerWorkspaceError
        message={
          partnersQ.error instanceof Error ? partnersQ.error.message : "Failed to load partners"
        }
      />
    );
  }

  const submit = async () => {
    setMsg(null);
    if (!partnerId.trim() || !email.trim()) {
      setMsg({ type: "err", text: "Choose a partner and enter an email." });
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/super-referral-partners/${partnerId}/resend-invite`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const j = (await res.json()) as { success?: boolean; error?: string; data?: { message?: string } };
    setLoading(false);
    if (!res.ok || !j.success) {
      setMsg({ type: "err", text: j.error ?? "Request failed" });
      return;
    }
    setMsg({ type: "ok", text: j.data?.message ?? "Invite email sent. Check the inbox (and spam)." });
  };

  return (
    <PartnerWorkspaceShell className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partner clients</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Staff from CSV imports are linked to corporate partners. Resend the setup invite if
          someone did not get the email.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="size-5" aria-hidden />
            Resend staff invite email
          </CardTitle>
          <CardDescription>
            Refreshes the 6-digit code (48h) and sends the latest branded template. The person must
            already exist from a prior CSV import for that partner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resend-partner">Corporate partner</Label>
            <select
              id="resend-partner"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              disabled={loading}
              className={cn(
                "flex h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm",
                "disabled:opacity-50 dark:bg-input/30",
              )}
            >
              <option value="">Select partner…</option>
              {(partnersQ.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.referralSlug})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resend-email">Staff email (as in CSV)</Label>
            <Input
              id="resend-email"
              type="email"
              autoComplete="email"
              className="h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={loading}
            />
          </div>
          {msg ? (
            <p
              role="status"
              className={
                msg.type === "ok"
                  ? "text-sm text-green-700 dark:text-green-400"
                  : "text-sm text-destructive"
              }
            >
              {msg.text}
            </p>
          ) : null}
          <Button
            type="button"
            className="h-12 w-full sm:w-auto"
            disabled={loading || !partnerId || !email.trim()}
            onClick={() => void submit()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send invite email"
            )}
          </Button>
        </CardContent>
      </Card>
    </PartnerWorkspaceShell>
  );
}
