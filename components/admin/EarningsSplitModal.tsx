"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapistId: string;
  therapistName: string;
  sessionRate: number;
  currentTherapistPercent: number;
};

export function EarningsSplitModal({
  open,
  onOpenChange,
  therapistId,
  therapistName,
  sessionRate,
  currentTherapistPercent,
}: Props) {
  const qc = useQueryClient();
  const [pct, setPct] = useState(String(currentTherapistPercent));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setPct(String(currentTherapistPercent));
      setNotes("");
    }
  }, [open, currentTherapistPercent]);

  const platformPct = Math.round((100 - Number(pct || 0)) * 100) / 100;
  const therapistNgn = Math.round(((sessionRate * Number(pct || 0)) / 100) * 100) / 100;
  const platformNgn = Math.round((sessionRate - therapistNgn) * 100) / 100;

  const saveM = useMutation({
    mutationFn: async () => {
      const n = Number(pct);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        throw new Error("Enter a percentage between 0 and 100.");
      }
      const res = await fetch("/api/admin/earnings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapistId,
          therapistPercent: n,
          notes: notes.trim() || undefined,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Save failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-therapists"] });
      void qc.invalidateQueries({ queryKey: ["admin-earnings"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Earnings split — {therapistName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Default is 45% therapist / 55% platform (per session list price).
        </p>

        <div className="space-y-2">
          <Label htmlFor="therapist-pct">Therapist share (%)</Label>
          <Input
            id="therapist-pct"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="tabular-nums"
          />
          <p className="text-xs text-muted-foreground">
            Platform share: {platformPct}% (auto)
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">At ₦{sessionRate.toLocaleString("en-NG")} / session</p>
          <p className="mt-1 text-muted-foreground">
            Therapist: {pct || "0"}% ≈ ₦{therapistNgn.toLocaleString("en-NG")}
          </p>
          <p className="text-muted-foreground">
            Platform: {platformPct}% ≈ ₦{platformNgn.toLocaleString("en-NG")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="earn-notes">Internal notes (optional)</Label>
          <Input
            id="earn-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Senior rate agreement"
          />
        </div>

        {saveM.isError ? (
          <p className="text-sm text-destructive">
            {saveM.error instanceof Error ? saveM.error.message : "Error"}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-primary"
            disabled={saveM.isPending}
            onClick={() => saveM.mutate()}
          >
            {saveM.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
