"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

type OverrideRow = {
  id: string;
  date: string;
  isBlocked: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
};

type AvailabilityResponse = {
  success?: boolean;
  data?: {
    schedule: unknown[];
    overrides: OverrideRow[];
  };
  error?: string;
};

export function DateOverrideManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: "",
    isBlocked: true,
    startTime: "",
    endTime: "",
    reason: "",
  });

  const { data } = useQuery({
    queryKey: ["therapist-availability"],
    queryFn: async () => {
      const r = await fetch("/api/therapist/availability", {
        credentials: "include",
      });
      const j = (await r.json()) as AvailabilityResponse;
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      return j;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (override: typeof form) => {
      const r = await fetch("/api/therapist/availability/overrides", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(override),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      return j;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["therapist-availability"] });
      setShowForm(false);
      setForm({
        date: "",
        isBlocked: true,
        startTime: "",
        endTime: "",
        reason: "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      const r = await fetch("/api/therapist/availability/overrides", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideId }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Delete failed");
      return j;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["therapist-availability"] });
    },
  });

  const overrides = data?.data?.overrides ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Date overrides
          </h2>
          <p className="text-sm text-muted-foreground">
            Block a day or add one-off hours (WAT).
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="h-11 bg-primary text-primary-foreground"
        >
          {showForm ? "Close" : "Add override"}
        </Button>
      </div>

      {showForm ? (
        <div className="mb-4 space-y-3 rounded-xl bg-muted/50 p-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, isBlocked: true }))}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium ${
                form.isBlocked
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-border text-muted-foreground"
              }`}
            >
              Block this day
            </button>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, isBlocked: false }))}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium ${
                !form.isBlocked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-border text-muted-foreground"
              }`}
            >
              Add hours
            </button>
          </div>

          {!form.isBlocked ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Start time
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startTime: e.target.value }))
                  }
                  className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  End time
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endTime: e.target.value }))
                  }
                  className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Reason (optional)
            </label>
            <input
              value={form.reason}
              onChange={(e) =>
                setForm((p) => ({ ...p, reason: e.target.value }))
              }
              placeholder="e.g. Holiday, training"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => addMutation.mutate(form)}
              disabled={!form.date || addMutation.isPending}
              className="h-11 flex-1 bg-primary text-primary-foreground"
            >
              {addMutation.isPending ? "Saving…" : "Save override"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="h-11"
            >
              Cancel
            </Button>
          </div>
          {addMutation.isError ? (
            <p className="text-sm text-destructive">
              {addMutation.error instanceof Error
                ? addMutation.error.message
                : "Error"}
            </p>
          ) : null}
        </div>
      ) : null}

      {overrides.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No overrides. Your weekly schedule applies to every date.
        </p>
      ) : (
        <div className="space-y-2">
          {overrides.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-xl bg-muted/40 p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {new Date(o.date).toLocaleDateString("en-NG", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "Africa/Lagos",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {o.isBlocked
                    ? `Blocked${o.reason ? ` — ${o.reason}` : ""}`
                    : `${o.startTime ?? ""} – ${o.endTime ?? ""}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(o.id)}
                className="min-h-12 px-3 text-sm text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
