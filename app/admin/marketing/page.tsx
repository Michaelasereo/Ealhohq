"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_SEQUENCE_TEMPLATES, LAST_SEQUENCE_STEP } from "@/lib/email/sequences/burnout-sequence";

type StepConfig = {
  step: number;
  subject: string;
  body: string;
  ctaLabel: string;
};

function stepKeys(step: number) {
  return {
    subject: `marketing_seq_day${step}_subject`,
    body: `marketing_seq_day${step}_body`,
    cta: `marketing_seq_day${step}_cta`,
  };
}

export default function AdminMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<StepConfig[]>(
    Array.from({ length: LAST_SEQUENCE_STEP }, (_, i) => {
      const step = i + 1;
      const d = DEFAULT_SEQUENCE_TEMPLATES[step];
      return { step, subject: d.subject, body: d.body, ctaLabel: d.ctaLabel };
    }),
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing-sequence", { credentials: "include" });
      const json = (await res.json()) as {
        data?: Array<{ key: string; value: string }>;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not load marketing sequence settings.");
        return;
      }
      const byKey = new Map((json.data ?? []).map((r) => [r.key, r.value]));
      setItems((prev) =>
        prev.map((item) => {
          const keys = stepKeys(item.step);
          return {
            ...item,
            subject: byKey.get(keys.subject)?.trim() || item.subject,
            body: byKey.get(keys.body)?.trim() || item.body,
            ctaLabel: byKey.get(keys.cta)?.trim() || item.ctaLabel,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const active = useMemo(
    () => items.find((i) => i.step === activeStep) ?? items[0],
    [activeStep, items],
  );

  const updateActive = (patch: Partial<StepConfig>) => {
    setItems((prev) => prev.map((item) => (item.step === activeStep ? { ...item, ...patch } : item)));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/marketing-sequence", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save sequence settings.");
        return;
      }
      setMessage("Marketing sequence saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Loading marketing settings...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Configure all 5 burnout sequence emails and the PDF download CTA.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Steps</CardTitle>
            <CardDescription>Sidebar for sequence editing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(item.step)}
                className={[
                  "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  activeStep === item.step
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-muted",
                ].join(" ")}
              >
                Day {item.step === 1 ? "1 (instant)" : item.step === 2 ? "3" : item.step === 3 ? "5" : item.step === 4 ? "7" : "10"}
              </button>
            ))}
            <Button type="button" className="mt-2 w-full" disabled={saving} onClick={() => void save()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save all"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Edit Day {active.step === 1 ? "1 (instant)" : active.step === 2 ? "3" : active.step === 3 ? "5" : active.step === 4 ? "7" : "10"}
            </CardTitle>
            <CardDescription>Keep body concise: 3 short paragraphs/sentences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={active.subject}
                onChange={(e) => updateActive({ subject: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Body (3 short paragraphs)</Label>
              <textarea
                value={active.body}
                onChange={(e) => updateActive({ body: e.target.value })}
                rows={8}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Button label (PDF download)</Label>
              <Input
                value={active.ctaLabel}
                onChange={(e) => updateActive({ ctaLabel: e.target.value })}
                className="h-11"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
