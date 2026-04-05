"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { formatNgn } from "@/lib/format-ngn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type TherapistDetail = {
  id: string;
  status: string;
  bio: string | null;
  specializations: string[];
  qualifications: string[];
  sessionRate: number;
  sessionDuration: number;
  createdAt: string;
  email: string | null;
  profile: { fullName: string; phone: string | null };
  _count: { sessions: number; bookings: number };
};

const DURATION_OPTIONS = [50, 60, 90] as const;

export function TherapistDetailSheet({
  therapist,
  open,
  onOpenChange,
  onTherapistUpdate,
}: {
  therapist: TherapistDetail | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onTherapistUpdate?: (
    partial: Pick<TherapistDetail, "sessionRate" | "sessionDuration">,
  ) => void;
}) {
  const qc = useQueryClient();
  const [sessionRateInput, setSessionRateInput] = useState("");
  const [sessionDurationSel, setSessionDurationSel] = useState<
    (typeof DURATION_OPTIONS)[number]
  >(50);

  useEffect(() => {
    if (!therapist) return;
    setSessionRateInput(String(Math.round(therapist.sessionRate)));
    setSessionDurationSel(
      DURATION_OPTIONS.includes(
        therapist.sessionDuration as (typeof DURATION_OPTIONS)[number],
      )
        ? (therapist.sessionDuration as (typeof DURATION_OPTIONS)[number])
        : 50,
    );
  }, [therapist]);

  const saveRates = useMutation({
    mutationFn: async () => {
      if (!therapist) throw new Error("No therapist");
      const rate = Number(sessionRateInput);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Enter a valid session rate");
      }
      const res = await fetch(`/api/admin/therapists/${therapist.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionRate: rate,
          sessionDuration: sessionDurationSel,
        }),
      });
      const j = (await res.json()) as {
        success?: boolean;
        data?: { sessionRate: number; sessionDuration: number };
        error?: string;
      };
      if (!res.ok || !j.success || !j.data) {
        throw new Error(j.error ?? "Save failed");
      }
      return j.data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["admin-therapists"] });
      if (therapist && onTherapistUpdate) {
        onTherapistUpdate({
          sessionRate: data.sessionRate,
          sessionDuration: data.sessionDuration,
        });
      }
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {!therapist ? (
          <p className="text-sm text-muted-foreground">No therapist selected.</p>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{therapist.profile.fullName}</SheetTitle>
              <SheetDescription>
                Therapist profile · {therapist.status}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4 px-1 pb-8 text-sm">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Contact
                </p>
                <p>{therapist.email ?? "—"}</p>
                <p>{therapist.profile.phone ?? "—"}</p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Pricing (admin)
                </p>
                <div className="space-y-2">
                  <Label htmlFor="admin-session-rate">Session Rate (₦)</Label>
                  <Input
                    id="admin-session-rate"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="15000"
                    value={sessionRateInput}
                    onChange={(e) => setSessionRateInput(e.target.value)}
                    className="min-h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount in Naira per session
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-session-duration">Session Duration</Label>
                  <select
                    id="admin-session-duration"
                    value={sessionDurationSel}
                    onChange={(e) =>
                      setSessionDurationSel(
                        Number(e.target.value) as (typeof DURATION_OPTIONS)[number],
                      )
                    }
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {DURATION_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  className="w-full min-h-11"
                  disabled={saveRates.isPending}
                  onClick={() => saveRates.mutate()}
                >
                  {saveRates.isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save session pricing"
                  )}
                </Button>
                {saveRates.isError ? (
                  <p className="text-xs text-destructive">
                    {saveRates.error instanceof Error
                      ? saveRates.error.message
                      : "Could not save"}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Current display
                </p>
                <p>
                  {formatNgn(therapist.sessionRate)} · {therapist.sessionDuration}{" "}
                  min sessions
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Focus
                </p>
                <p>{therapist.specializations.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Bio
                </p>
                <p className="whitespace-pre-wrap">{therapist.bio ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Qualifications
                </p>
                <p>{therapist.qualifications.join("; ") || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Activity
                </p>
                <p>
                  {therapist._count.sessions} sessions · {therapist._count.bookings}{" "}
                  bookings
                </p>
                <p className="text-muted-foreground mt-1">
                  Joined{" "}
                  {new Date(therapist.createdAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
