"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Check, Users, Zap } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CITY_LABELS,
  INTEREST_LABELS,
  ROLE_LABELS,
  TEAM_SIZE_LABELS,
} from "@/lib/leads/clinic-lead-labels";
import {
  CITY_VALUES,
  INTEREST_IDS,
  clinicLeadSchema,
  ROLE_VALUES,
  TEAM_SIZE_VALUES,
} from "@/lib/leads/clinic-lead-schema";
const benefits = [
  {
    icon: Building2,
    title: "On-site or remote",
    sub: "We come to you or set you up remotely — your choice.",
  },
  {
    icon: Users,
    title: "For your whole team",
    sub: "Therapy access and AI documentation for every practitioner.",
  },
  {
    icon: Zap,
    title: "Up and running in 48 hours",
    sub: "No lengthy onboarding. Your team is live within 2 days.",
  },
] as const;

const selectClass =
  "flex h-11 min-h-11 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

export function ClinicPartnership() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    resolver: zodResolver(clinicLeadSchema),
    defaultValues: {
      fullName: "",
      role: "",
      clinicName: "",
      city: "",
      teamSize: "",
      interests: [] as Array<(typeof INTEREST_IDS)[number]>,
      whatsapp: "",
    },
  });

  const interests = form.watch("interests") ?? [];

  const toggleInterest = (id: (typeof INTEREST_IDS)[number]) => {
    const next = interests.includes(id)
      ? interests.filter((x) => x !== id)
      : [...interests, id];
    form.setValue("interests", next, { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/leads/clinic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
      if (!res.ok || !json.success) {
        const apiMsg =
          typeof json.error === "string" && json.error.length > 0
            ? json.error
            : res.status === 400
              ? "Please check all required fields, selects, and at least one interest."
              : "Something went wrong. Please email hello@ealho.com";
        setSubmitError(apiMsg);
        if (json.fieldErrors && typeof json.fieldErrors === "object") {
          for (const [key, msgs] of Object.entries(json.fieldErrors)) {
            if (Array.isArray(msgs) && msgs[0]) {
              form.setError(key as never, { message: msgs[0] });
            }
          }
        }
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError(
        "Network error. Check your connection or email hello@ealho.com",
      );
    }
  });

  return (
    <section
      id="clinic-partnership"
      className="scroll-mt-24 bg-[#FAF8F5] px-4 py-14 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14 lg:items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#807a5a]">
              For clinics &amp; organisations
            </p>
            <h2 className="mt-3 text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[#1A1A1A] sm:text-[2rem] lg:text-[2.25rem]">
              Bring Ealho to your practice.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-gray-600 sm:text-[16px]">
              Whether you run a private clinic, a hospital department, or a telemedicine platform —
              we want to work with you. Tell us about your practice and we&apos;ll reach out within
              24 hours.
            </p>

            <div className="mt-6 space-y-3">
              {benefits.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#292612]/10">
                    <item.icon
                      size={15}
                      strokeWidth={1.5}
                      className="text-[#292612]"
                      aria-hidden
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-gray-400">
              Trusted by clinics in Lagos and Abuja. Response within 24 hours guaranteed.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
            <h3 className="text-lg font-semibold text-[#1A1A1A]">Tell us about your practice</h3>
            <p className="mt-1 text-sm text-gray-500">
              We&apos;ll reach out on WhatsApp within 24 hours.
            </p>

            {success ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                  <Check size={24} strokeWidth={1.5} className="text-green-600" />
                </div>
                <h4 className="mb-2 text-lg font-semibold text-gray-900">
                  We&apos;ve got your details!
                </h4>
                <p className="text-sm text-gray-500">
                  Expect a WhatsApp message from us within 24 hours. We&apos;re looking forward to
                  working with you.
                </p>
              </div>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Your name</Label>
                  <Input
                    id="fullName"
                    placeholder="Dr. Amaka Obi"
                    className="min-h-11"
                    {...form.register("fullName")}
                  />
                  {form.formState.errors.fullName ? (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.fullName.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Your role</Label>
                  <select id="role" className={selectClass} {...form.register("role")}>
                    <option value="">Select your role…</option>
                    {ROLE_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {ROLE_LABELS[v]}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.role ? (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.role.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinicName">Clinic or organisation name</Label>
                  <Input
                    id="clinicName"
                    placeholder="Sunrise Clinic Lagos"
                    className="min-h-11"
                    {...form.register("clinicName")}
                  />
                  {form.formState.errors.clinicName ? (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.clinicName.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <select id="city" className={selectClass} {...form.register("city")}>
                    <option value="">Select your city…</option>
                    {CITY_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {CITY_LABELS[v]}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.city ? (
                    <p className="text-sm text-red-500">{form.formState.errors.city.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamSize">Number of practitioners at your clinic</Label>
                  <select id="teamSize" className={selectClass} {...form.register("teamSize")}>
                    <option value="">Select…</option>
                    {TEAM_SIZE_VALUES.map((v) => (
                      <option key={v} value={v}>
                        {TEAM_SIZE_LABELS[v]}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.teamSize ? (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.teamSize.message}
                    </p>
                  ) : null}
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">
                    What are you interested in? (select all that apply)
                  </legend>
                  <div className="space-y-2.5 pt-1">
                    {INTEREST_IDS.map((id) => (
                      <label
                        key={id}
                        className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={interests.includes(id)}
                          onChange={() => toggleInterest(id)}
                          className="size-4 shrink-0 rounded border-gray-300 text-[#292612] focus:ring-[#292612]"
                        />
                        {INTEREST_LABELS[id]}
                      </label>
                    ))}
                  </div>
                  {form.formState.errors.interests ? (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.interests.message}
                    </p>
                  ) : null}
                </fieldset>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">Your WhatsApp number</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08012345678"
                    className="min-h-11"
                    {...form.register("whatsapp")}
                  />
                  <p className="text-xs text-gray-500">
                    We follow up on WhatsApp — much faster.
                  </p>
                  {form.formState.errors.whatsapp ? (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.whatsapp.message}
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="h-12 min-h-12 w-full rounded-lg bg-[#292612] text-[#D6EAE1] hover:bg-[#292612]/90"
                >
                  {form.formState.isSubmitting ? "Sending…" : "Send My Details →"}
                </Button>

                {submitError ? <p className="text-sm text-red-500">{submitError}</p> : null}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
