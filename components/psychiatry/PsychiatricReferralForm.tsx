"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Brain, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z.object({
  clinicalReason: z
    .string()
    .min(50, "Please provide at least 50 characters of clinical reasoning")
    .max(2000, "Maximum 2000 characters"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  therapySessionId: string;
  existingReferral?: { id: string; clinicalReason: string; status: string } | null;
};

export function PsychiatricReferralForm({
  therapySessionId,
  existingReferral,
}: Props) {
  const [submitted, setSubmitted] = useState(
    Boolean(existingReferral?.id && existingReferral.status !== "declined"),
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clinicalReason: existingReferral?.clinicalReason ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/therapist/psychiatric-referral", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapySessionId,
        clinicalReason: values.clinicalReason,
      }),
    });
    const j = (await res.json()) as { success?: boolean; error?: unknown };
    if (!res.ok || !j.success) {
      throw new Error(
        typeof j.error === "string" ? j.error : "Could not submit referral",
      );
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Brain
            className="mt-0.5 size-4 shrink-0 text-blue-700"
            strokeWidth={1.5}
          />
          <div>
            <p className="text-sm font-semibold text-blue-950">
              Psychiatric referral submitted
            </p>
            <p className="text-xs text-blue-900/90">
              The Ealho admin team has been notified and will coordinate the
              assessment with the client. You will receive a summary after the
              psychiatric session.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <AlertCircle
          className="mt-0.5 size-3.5 shrink-0 text-amber-700"
          strokeWidth={1.5}
        />
        <p className="text-xs text-amber-950/90">
          This notifies the Ealho admin team. The client must accept the
          invitation and complete payment or credits before the session is
          confirmed. Psychiatric assessments are billed separately from
          therapy.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clinicalReason">
          Clinical reasoning <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="clinicalReason"
          rows={5}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Describe your clinical reasoning for this referral: symptoms, duration, response to therapy, and relevant history."
          {...register("clinicalReason")}
        />
        {errors.clinicalReason ? (
          <p className="text-xs text-destructive">
            {errors.clinicalReason.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Shared with the consulting psychiatrist as a referral summary (not
          the full therapy record).
        </p>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className={cn("h-12 w-full")}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit psychiatric referral"
        )}
      </Button>
    </form>
  );
}
