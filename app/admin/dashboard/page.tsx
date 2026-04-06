"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { LoadingWithCopy } from "@/components/shared/LoadingWithCopy";
import { ADMIN_MESSAGES } from "@/lib/loading-messages";
import { stripTherapistHonorific } from "@/lib/therapist-display-name";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PendingApplication = {
  id: string;
  createdAt: string;
  profile: { fullName: string; phone: string | null };
};

type AdminDashboardPayload = {
  stats: {
    totalPatients: number;
    totalTherapists: number;
    pendingTherapists: number;
    sessionsThisMonth: number;
  };
  pendingApplications: PendingApplication[];
};

async function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  const res = await fetch("/api/admin/dashboard", { credentials: "include" });
  const json = (await res.json()) as {
    success?: boolean;
    data?: AdminDashboardPayload;
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    if (res.status === 401) {
      throw new Error(
        json.error ??
          "Unauthorized. Sign in at /admin/login with an admin account. If you set role only in the database, sign out and sign in again so your session includes admin claims.",
      );
    }
    throw new Error(json.error ?? "Failed to load admin dashboard");
  }
  return json.data;
}

export default function AdminDashboardPage() {
  const qc = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminDashboard,
  });

  const approve = useMutation({
    onMutate: () => ({ toastId: toast.loading("Approving therapist...") }),
    mutationFn: async (therapistId: string) => {
      const res = await fetch(
        `/api/admin/therapists/${therapistId}/approve`,
        { method: "PUT", credentials: "include" },
      );
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Approve failed");
    },
    onSuccess: (_d, _id, ctx) => {
      if (ctx?.toastId) toast.dismiss(ctx.toastId);
      toast.success("Therapist approved ✅");
      void qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.toastId) toast.dismiss(ctx.toastId);
      toast.error("Something went wrong.");
    },
  });

  const reject = useMutation({
    mutationFn: async ({
      therapistId,
      reason,
    }: {
      therapistId: string;
      reason: string;
    }) => {
      const res = await fetch(
        `/api/admin/therapists/${therapistId}/reject`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Reject failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setRejectingId(null);
      setRejectReason("");
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center p-4">
        <LoadingWithCopy messages={[...ADMIN_MESSAGES]} size="lg" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Error"}
        </p>
      </main>
    );
  }

  const { stats, pendingApplications } = data;
  const pendingHighlight = stats.pendingTherapists > 0;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-8 p-4 pb-20">
      <header>
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform overview and therapist applications.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total clients</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.totalPatients}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved therapists</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.totalTherapists}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card
          className={cn(
            pendingHighlight &&
              "border-amber-400/90 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
          )}
        >
          <CardHeader className="pb-2">
            <CardDescription>Pending applications</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.pendingTherapists}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sessions this month</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {stats.sessionsThisMonth}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pending therapist applications</h2>
        {pendingApplications.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No pending applications.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4">
            {pendingApplications.map((t) => (
              <li key={t.id}>
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <div>
                      <p className="font-medium">
                        {stripTherapistHonorific(t.profile.fullName)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t.profile.phone ?? "No phone on file"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Applied{" "}
                        {new Date(t.createdAt).toLocaleString("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    {rejectingId === t.id ? (
                      <div className="space-y-3 rounded-lg border border-border p-3">
                        <Label htmlFor={`reason-${t.id}`}>
                          Rejection reason (optional)
                        </Label>
                        <Input
                          id={`reason-${t.id}`}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason shown in metadata"
                          className="min-h-10"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            className="min-h-11"
                            disabled={reject.isPending}
                            onClick={() =>
                              reject.mutate({
                                therapistId: t.id,
                                reason: rejectReason,
                              })
                            }
                          >
                            {reject.isPending ? "Rejecting…" : "Confirm reject"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-11"
                            disabled={reject.isPending}
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="min-h-11 min-w-[120px]"
                          disabled={approve.isPending}
                          onClick={() => approve.mutate(t.id)}
                        >
                          {approve.isPending ? "…" : "Approve"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="min-h-11 min-w-[120px]"
                          onClick={() => {
                            setRejectingId(t.id);
                            setRejectReason("");
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
