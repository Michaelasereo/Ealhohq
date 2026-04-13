"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const RX_CATEGORIES = [
  "Antidepressant (SSRI)",
  "Antidepressant (SNRI)",
  "Anxiolytic (benzodiazepine)",
  "Antipsychotic",
  "Mood stabiliser",
  "Other",
] as const;

type RxDraft = {
  medicationName: string;
  category: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const emptyRx = (): RxDraft => ({
  medicationName: "",
  category: RX_CATEGORIES[0],
  dosage: "",
  frequency: "Once daily",
  duration: "2 weeks",
  instructions: "",
});

export default function PsychiatristSessionCompletePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [summaryForTherapist, setSummaryForTherapist] = useState("");
  const [patientConsentedToShareNotes, setPatientConsentedToShareNotes] =
    useState(false);
  const [rxList, setRxList] = useState<RxDraft[]>([]);
  const [draft, setDraft] = useState<RxDraft>(emptyRx());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addRx() {
    if (!draft.medicationName.trim() || !draft.dosage.trim()) return;
    setRxList((l) => [...l, { ...draft }]);
    setDraft(emptyRx());
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!termsAccepted) {
      setErr("Please accept the terms to continue.");
      return;
    }
    if (sessionNotes.trim().length < 50) {
      setErr("Session notes must be at least 50 characters.");
      return;
    }
    if (summaryForTherapist.trim().length < 20) {
      setErr("Therapist summary must be at least 20 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/psychiatrist/sessions/${sessionId}/complete`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionNotes: sessionNotes.trim(),
          summaryForTherapist: summaryForTherapist.trim(),
          prescriptions: rxList.map((p) => ({
            medicationName: p.medicationName.trim(),
            category: p.category,
            dosage: p.dosage.trim(),
            frequency: p.frequency.trim(),
            duration: p.duration.trim(),
            instructions: p.instructions.trim() || null,
          })),
          termsAccepted: true,
          patientConsentedToShareNotes,
        }),
      });
      const j = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !j.success) {
        throw new Error(j.error ?? "Could not save");
      }
      router.push("/psychiatrist/sessions");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-4 pb-20">
      <div>
        <h1 className="text-xl font-semibold">Post-session assessment</h1>
        <p className="text-sm text-muted-foreground">
          Complete your notes and prescriptions. Submissions are logged for
          MDCN-aligned practice.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex items-start gap-3 rounded-xl border p-3">
          <input
            id="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 size-5 shrink-0 rounded border-input"
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed">
            I confirm this assessment was conducted in line with my professional
            obligations (MDCN) and Ealho psychiatry partner terms.
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Clinical notes (not shared with client)</Label>
          <textarea
            id="notes"
            disabled={!termsAccepted}
            rows={8}
            className="flex min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Presenting complaint, MSE, risk, impression, plan…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Summary for referring therapist</Label>
          <textarea
            id="summary"
            disabled={!termsAccepted}
            rows={4}
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            value={summaryForTherapist}
            onChange={(e) => setSummaryForTherapist(e.target.value)}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">
            {summaryForTherapist.length}/1000
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <div>
            <p className="text-sm font-medium">Share full notes with therapist</p>
            <p className="text-xs text-muted-foreground">
              Only if the client consented on-platform.
            </p>
          </div>
          <input
            type="checkbox"
            checked={patientConsentedToShareNotes}
            onChange={(e) => setPatientConsentedToShareNotes(e.target.checked)}
            disabled={!termsAccepted}
            className="size-5 rounded border-input"
          />
        </div>

        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="text-sm font-semibold">Prescriptions (optional)</h2>
          {rxList.map((rx, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs"
            >
              <span>
                {rx.medicationName} {rx.dosage} · {rx.frequency}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() =>
                  setRxList((l) => l.filter((_, j) => j !== i))
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Medication"
              value={draft.medicationName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, medicationName: e.target.value }))
              }
              disabled={!termsAccepted}
              className="h-12 sm:col-span-2"
            />
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({ ...d, category: e.target.value }))
              }
              disabled={!termsAccepted}
              className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {RX_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Input
              placeholder="Dosage e.g. 50mg"
              value={draft.dosage}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dosage: e.target.value }))
              }
              disabled={!termsAccepted}
              className="h-12"
            />
            <Input
              placeholder="Frequency"
              value={draft.frequency}
              onChange={(e) =>
                setDraft((d) => ({ ...d, frequency: e.target.value }))
              }
              disabled={!termsAccepted}
              className="h-12"
            />
            <Input
              placeholder="Duration"
              value={draft.duration}
              onChange={(e) =>
                setDraft((d) => ({ ...d, duration: e.target.value }))
              }
              disabled={!termsAccepted}
              className="h-12"
            />
            <Input
              placeholder="Instructions (optional)"
              value={draft.instructions}
              onChange={(e) =>
                setDraft((d) => ({ ...d, instructions: e.target.value }))
              }
              disabled={!termsAccepted}
              className="h-12 sm:col-span-2"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-full"
            disabled={!termsAccepted}
            onClick={addRx}
          >
            Add medication
          </Button>
        </section>

        {err ? (
          <p className="text-sm text-destructive" role="alert">
            {err}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-12 w-full"
          disabled={
            submitting ||
            !termsAccepted ||
            sessionNotes.trim().length < 50 ||
            summaryForTherapist.trim().length < 20
          }
        >
          {submitting ? "Saving…" : "Submit assessment"}
        </Button>

        <Link
          href="/psychiatrist/sessions"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "flex h-12 w-full items-center justify-center",
          )}
        >
          Cancel
        </Link>
      </form>
    </main>
  );
}
