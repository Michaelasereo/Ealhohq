"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReferralRow = {
  id: string;
  status: string;
  clinicalReason: string;
  createdAt: string;
  therapistName: string;
  patientIdShort: string;
  bookingId: string | null;
  psychiatricSessionId: string | null;
  psychiatristName: string | null;
};

type PsychOption = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
};

export function AdminPsychiatricReferralsPanel() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bookFor, setBookFor] = useState<ReferralRow | null>(null);
  const [psychId, setPsychId] = useState("");
  const [dateYmd, setDateYmd] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);

  const listQ = useQuery({
    queryKey: ["admin-psychiatric-referrals"],
    queryFn: async () => {
      const r = await fetch("/api/admin/psychiatric-referrals", {
        credentials: "include",
      });
      const j = (await r.json()) as { success?: boolean; data?: ReferralRow[] };
      if (!r.ok || !j.success) throw new Error("Failed");
      return j.data ?? [];
    },
  });

  const psychsQ = useQuery({
    queryKey: ["admin-psychiatrists-options"],
    queryFn: async () => {
      const r = await fetch("/api/admin/psychiatrists", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: PsychOption[];
      };
      if (!r.ok || !j.success) throw new Error("Failed");
      return (j.data ?? []).filter(
        (p) => p.id && p.isActive !== false,
      );
    },
  });

  const bookMut = useMutation({
    mutationFn: async () => {
      if (!bookFor || !psychId || !dateYmd || !startTime) {
        throw new Error("Pick psychiatrist, date, and time");
      }
      const r = await fetch(`/api/admin/psychiatric-referrals/${bookFor.id}/book`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          psychiatristId: psychId,
          date: dateYmd,
          startTime,
          notifyEmail: true,
          notifyWhatsApp: true,
        }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) throw new Error(j.error ?? "Book failed");
    },
    onSuccess: () => {
      setBookFor(null);
      void qc.invalidateQueries({ queryKey: ["admin-psychiatric-referrals"] });
    },
  });

  const rows = listQ.data ?? [];

  const psychOptions = useMemo(
    () =>
      (psychsQ.data ?? []).map((p) => ({
        id: p.id,
        label: `${p.name} (${p.email})`,
      })),
    [psychsQ.data],
  );

  async function loadSlots() {
    if (!psychId || !dateYmd) return;
    setSlotsLoading(true);
    try {
      const r = await fetch(
        `/api/admin/psychiatrists/${psychId}/slots?date=${encodeURIComponent(dateYmd)}`,
        { credentials: "include" },
      );
      const j = (await r.json()) as {
        success?: boolean;
        data?: { slots: string[] };
      };
      if (r.ok && j.success && j.data?.slots) {
        setSlots(j.data.slots);
        setStartTime(j.data.slots[0] ?? "");
      } else {
        setSlots([]);
        setStartTime("");
      }
    } finally {
      setSlotsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Referrals</h2>
        <p className="text-sm text-muted-foreground">
          When status is <span className="font-medium">flagged</span>, book a
          slot and the client receives a dashboard invitation.
        </p>
      </div>

      {listQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : listQ.isError ? (
        <p className="text-sm text-destructive">Could not load referrals.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No referrals yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-card p-4 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">Client {r.patientIdShort}</p>
                  <p className="text-xs text-muted-foreground">
                    Therapist: {r.therapistName} · {r.status} ·{" "}
                    {new Date(r.createdAt).toLocaleString("en-NG")}
                  </p>
                </div>
                {r.status === "flagged" ? (
                  <Button
                    type="button"
                    className="h-11"
                    onClick={() => {
                      setBookFor(r);
                      setPsychId(psychOptions[0]?.id ?? "");
                      setDateYmd(
                        new Date().toISOString().slice(0, 10),
                      );
                      setSlots([]);
                      setStartTime("");
                    }}
                  >
                    Book session
                  </Button>
                ) : null}
              </div>
              <button
                type="button"
                className="mt-2 text-xs text-primary hover:underline"
                onClick={() =>
                  setExpanded((x) => (x === r.id ? null : r.id))
                }
              >
                {expanded === r.id ? "Hide" : "View"} clinical reasoning
              </button>
              {expanded === r.id ? (
                <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
                  {r.clinicalReason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(bookFor)} onOpenChange={(o) => !o && setBookFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book psychiatric session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="psych-pick">Psychiatrist</Label>
              <select
                id="psych-pick"
                value={psychId}
                onChange={(e) => {
                  setPsychId(e.target.value);
                  setSlots([]);
                  setStartTime("");
                }}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select…</option>
                {psychOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdate">Date (WAT calendar day)</Label>
              <Input
                id="pdate"
                type="date"
                className="h-12"
                value={dateYmd}
                onChange={(e) => {
                  setDateYmd(e.target.value);
                  setSlots([]);
                  setStartTime("");
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={() => void loadSlots()}
              disabled={!psychId || !dateYmd || slotsLoading}
            >
              {slotsLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Loading slots…
                </>
              ) : (
                "Load available times"
              )}
            </Button>
            {slots.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="psych-slot">Start time</Label>
                <select
                  id="psych-slot"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {slots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              If no slots appear, set weekly availability for this psychiatrist
              (Admin → Psychiatry directory) via the availability API or DB seed.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setBookFor(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11"
              disabled={bookMut.isPending || !startTime}
              onClick={() => bookMut.mutate()}
            >
              {bookMut.isPending ? "Booking…" : "Book & notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
