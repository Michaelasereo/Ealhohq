"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, EyeOff, Loader2, Shield, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().optional(),
  email: z.string().trim().email("Enter a valid email"),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_TITLE = "Get your free burnout guide";
const DEFAULT_SUBTITLE =
  "Enter your name and email — we’ll send you the PDF by email right away.";
const DEFAULT_SUCCESS =
  "You’re all set. Check your inbox for the PDF (and your spam folder if you don’t see it).";

const EALHO_LOGO = "/Ealho-logo.svg";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BurnoutFreebieModal({ open, onClose }: Props) {
  const [phase, setPhase] = useState<"form" | "success">("form");
  const [stayAnonymous, setStayAnonymous] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [successTemplate, setSuccessTemplate] = useState(DEFAULT_SUCCESS);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submittedFirstName, setSubmittedFirstName] = useState("");
  const [submittedAnonymous, setSubmittedAnonymous] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    if (!open) return;
    setPhase("form");
    setStayAnonymous(false);
    setSubmitError(null);
    setLoadError(null);
    form.reset();
    void (async () => {
      try {
        const res = await fetch(
          "/api/site-config?keys=burnout_modal_title,burnout_modal_subtitle,burnout_modal_success_message",
        );
        const json = (await res.json()) as { data?: Record<string, string | null> };
        if (json.data?.burnout_modal_title?.trim())
          setTitle(json.data.burnout_modal_title.trim());
        else setTitle(DEFAULT_TITLE);
        if (json.data?.burnout_modal_subtitle?.trim())
          setSubtitle(json.data.burnout_modal_subtitle.trim());
        else setSubtitle(DEFAULT_SUBTITLE);
        if (json.data?.burnout_modal_success_message?.trim())
          setSuccessTemplate(json.data.burnout_modal_success_message.trim());
        else setSuccessTemplate(DEFAULT_SUCCESS);
      } catch {
        setLoadError("Could not load form text. You can still submit.");
      }
    })();
  }, [open, form]);

  function handleClose() {
    setPhase("form");
    setStayAnonymous(false);
    setSubmitError(null);
    setLoadError(null);
    form.reset();
    onClose();
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const nameTrim = values.name?.trim() ?? "";
    if (!stayAnonymous && !nameTrim) {
      form.setError("name", { type: "manual", message: "Enter your name" });
      return;
    }
    form.clearErrors("name");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: stayAnonymous ? undefined : nameTrim,
          email: values.email,
          isAnonymous: stayAnonymous,
          source: "burnout_assessment",
        }),
      });
      const json = (await res.json()) as { error?: string; success?: boolean };
      if (res.status === 409) {
        setSubmittedEmail(values.email);
        setSubmittedFirstName(stayAnonymous ? "there" : (nameTrim.split(/\s+/)[0] ?? nameTrim));
        setSubmittedAnonymous(stayAnonymous);
        setPhase("success");
        return;
      }
      if (!res.ok || !json.success) {
        setSubmitError(json.error ?? "Something went wrong");
        return;
      }
      setSubmittedEmail(values.email);
      setSubmittedFirstName(stayAnonymous ? "there" : (nameTrim.split(/\s+/)[0] ?? nameTrim));
      setSubmittedAnonymous(stayAnonymous);
      setPhase("success");
    } catch {
      setSubmitError("Network error. Please try again.");
    }
  }

  const successText = successTemplate
    .replace(/\{email\}/gi, submittedEmail)
    .replace(/\{name\}/gi, submittedFirstName);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-[min(100vw-2rem,32rem)] max-h-[min(92vh,640px)] overflow-hidden border-0 p-0 shadow-2xl sm:max-w-lg sm:rounded-2xl",
          "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[92vh] max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl",
        )}
      >
        <div className="relative border-b border-gray-100 px-6 pb-5 pt-6 text-center">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} className="text-gray-600" />
          </button>

          <div className="mx-auto flex flex-col items-center px-2">
            <Image
              src={EALHO_LOGO}
              alt="Ealho"
              width={140}
              height={36}
              className="h-9 w-auto max-w-[160px] object-contain object-center"
            />
            <h2 className="mt-5 text-lg font-semibold leading-snug text-gray-900">{title}</h2>
            {phase === "form" ? (
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">{subtitle}</p>
            ) : null}
          </div>
          {loadError ? (
            <p className="mt-3 text-center text-xs text-amber-700">{loadError}</p>
          ) : null}
        </div>

        <div className="flex flex-col items-center px-6 pb-6 pt-5 text-center">
          {phase === "form" ? (
            <form
              className="w-full max-w-sm space-y-4"
              onSubmit={(e) => {
                void form.handleSubmit(onSubmit)(e);
              }}
            >
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <EyeOff size={15} strokeWidth={1.5} className="text-primary" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900">Stay anonymous</p>
                      <p className="text-xs text-gray-500">
                        You can choose to stay anonymous — no name required
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !stayAnonymous;
                      setStayAnonymous(next);
                      form.clearErrors("name");
                      if (next) form.setValue("name", "");
                    }}
                    className={cn(
                      "relative flex h-6 w-11 shrink-0 rounded-full transition-colors",
                      stayAnonymous ? "bg-primary" : "bg-gray-200",
                    )}
                    aria-pressed={stayAnonymous}
                    aria-label="Toggle stay anonymous"
                  >
                    <span
                      className={cn(
                        "absolute top-1 size-4 rounded-full bg-white transition-transform",
                        stayAnonymous ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                </div>
              </div>

              {!stayAnonymous ? (
                <div className="space-y-2 text-left">
                  <Label htmlFor="burnout-freebie-name">Name</Label>
                  <Input
                    id="burnout-freebie-name"
                    autoComplete="name"
                    className="h-12"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name ? (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2 text-left">
                <Label htmlFor="burnout-freebie-email">Email</Label>
                <Input
                  id="burnout-freebie-email"
                  type="email"
                  autoComplete="email"
                  className="h-12"
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                ) : null}
                <div className="flex gap-2.5 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 text-left">
                  <Shield
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <p className="text-xs leading-relaxed text-gray-600">
                    Your email is only used to send this guide. We keep it confidential and never
                    sell or share it with third parties.
                  </p>
                </div>
              </div>

              {submitError ? (
                <p className="text-center text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-12 w-full rounded-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Email me the PDF"
                )}
              </Button>
            </form>
          ) : (
            <div className="w-full max-w-sm py-4 text-center">
              <Image
                src={EALHO_LOGO}
                alt=""
                width={100}
                height={26}
                className="mx-auto h-7 w-auto opacity-90"
              />
              <div className="mx-auto mb-4 mt-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Check size={22} strokeWidth={1.5} className="text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Check your inbox</h3>
              <p className="mb-2 text-sm text-gray-500">
                Your assessment is on its way to {submittedEmail}.
              </p>
              <p className="text-xs text-gray-400">
                {submittedAnonymous
                  ? "We only have your email — nothing else."
                  : "We'll send you a few useful things over the next week."}
              </p>
              {successTemplate !== DEFAULT_SUCCESS ? (
                <p className="mt-3 text-xs text-gray-500">{successText}</p>
              ) : null}
              <Button type="button" variant="outline" className="mt-5 h-11 rounded-full" onClick={handleClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
