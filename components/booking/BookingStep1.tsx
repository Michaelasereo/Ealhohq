"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, EyeOff, Handshake } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import type { BookingData } from "@/components/booking/BookingModal";
import { PROFESSIONAL_TYPES } from "@/lib/booking/professional-types";
import { getReferralCode } from "@/lib/referral/client";

const REASON_CATEGORIES = [
  "Anxiety or worry",
  "Depression or low mood",
  "Trauma or PTSD",
  "Relationship issues",
  "Work or burnout",
  "Grief or loss",
  "Sleep problems",
  "Self-esteem",
  "Addiction",
  "Other",
] as const;

function buildStep1Schema(isAnonymous: boolean, isLoggedIn: boolean) {
  if (isLoggedIn) {
    return z.object({
      reason: z.string().optional(),
      professionalType: z.string().optional(),
    });
  }
  return z
    .object({
      fullName: z.string().optional(),
      email: z.string().trim().email("Valid email required"),
      phone: z.string().trim(),
      reason: z.string().optional(),
      professionalType: z.string().optional(),
      alias: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (isAnonymous) {
        const a = data.alias?.trim() ?? "";
        if (a.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please enter an alias for anonymous booking",
            path: ["alias"],
          });
        }
      } else {
        const n = data.fullName?.trim() ?? "";
        if (n.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Name is required",
            path: ["fullName"],
          });
        }
      }
      const digits = data.phone.replace(/\D/g, "");
      if (!isAnonymous) {
        if (digits.length < 11) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid Nigerian phone number (min 11 digits)",
            path: ["phone"],
          });
        }
      } else if (data.phone.trim() && digits.length < 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid Nigerian phone number (min 11 digits)",
          path: ["phone"],
        });
      }
    });
}

type Step1FormValues = {
  fullName?: string;
  email?: string;
  phone?: string;
  reason?: string;
  professionalType?: string;
  alias?: string;
};

type Props = {
  data: BookingData;
  onUpdate: (updates: Partial<BookingData>) => void;
  onNext: () => void;
  isLoggedIn?: boolean;
};

export function BookingStep1({
  data,
  onUpdate,
  onNext,
  isLoggedIn = false,
}: Props) {
  const [isAnonymous, setIsAnonymous] = useState(
    isLoggedIn ? false : data.isAnonymous,
  );
  const [hasReferral, setHasReferral] = useState(false);

  const schema = useMemo(
    () => buildStep1Schema(isAnonymous, isLoggedIn),
    [isAnonymous, isLoggedIn],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    reset,
  } = useForm<Step1FormValues>({
    resolver: zodResolver(schema) as Resolver<Step1FormValues>,
    defaultValues: isLoggedIn
      ? {
          reason: data.reason,
          professionalType: data.professionalType ?? "",
        }
      : {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          reason: data.reason,
          professionalType: data.professionalType ?? "",
          alias: data.alias,
        },
  });

  useEffect(() => {
    if (!isLoggedIn) {
      setIsAnonymous(data.isAnonymous);
    }
  }, [data.isAnonymous, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      reset({
        reason: data.reason,
        professionalType: data.professionalType ?? "",
      });
    } else {
      reset({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        reason: data.reason,
        professionalType: data.professionalType ?? "",
        alias: data.alias,
      });
    }
  }, [data, isLoggedIn, reset]);

  useEffect(() => {
    void trigger();
  }, [isAnonymous, schema, trigger]);

  useEffect(() => {
    setHasReferral(Boolean(getReferralCode()));
  }, []);

  function onSubmit(values: Step1FormValues) {
    if (isLoggedIn) {
      const v = values as { reason?: string; professionalType?: string };
      onUpdate({
        reason: v.reason?.trim() ?? "",
        reasonCategory: data.reasonCategory,
        professionalType: v.professionalType?.trim() ?? "",
        isAnonymous: false,
      });
      onNext();
      return;
    }
    const v = values as {
      fullName?: string;
      email: string;
      phone: string;
      reason?: string;
      professionalType?: string;
      alias?: string;
    };
    onUpdate({
      fullName: v.fullName?.trim() ?? "",
      email: v.email.trim(),
      phone: v.phone.trim(),
      reason: v.reason?.trim() ?? "",
      reasonCategory: data.reasonCategory,
      professionalType: v.professionalType?.trim() ?? "",
      isAnonymous,
      alias: v.alias?.trim() ?? "",
    });
    onNext();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
      {hasReferral ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#2C3B2D]/15 bg-[#2C3B2D]/5 px-3 py-2.5">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2C3B2D]/15">
            <Handshake size={11} strokeWidth={1.5} className="text-[#2C3B2D]" />
          </div>
          <p className="text-xs font-medium text-[#2C3B2D]">
            Referred by a healthcare partner
          </p>
        </div>
      ) : null}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-900">
          What brings you to therapy?
        </label>
        <textarea
          {...register("reason")}
          rows={3}
          placeholder="Tell us in your own words what you're going through. This helps us find the right therapist for you. You can be as brief or detailed as you like."
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors placeholder:text-xs placeholder:text-gray-400 focus:border-primary focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-400">Optional but helps us match you better.</p>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-gray-500">
          Or select a category (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {REASON_CATEGORIES.map((cat) => {
            const isSelected = data.reasonCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  onUpdate({
                    reasonCategory: isSelected ? "" : cat,
                  })
                }
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          What best describes you?
          <span className="ml-1 font-normal text-gray-400">(optional)</span>
        </label>
        <select
          {...register("professionalType")}
          className="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 transition-colors focus:border-[#2C3B2D] focus:outline-none"
          defaultValue=""
        >
          <option value="" disabled>
            Select your role...
          </option>
          {PROFESSIONAL_TYPES.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">Helps us match you with the right therapist.</p>
      </div>

      {!isLoggedIn ? <div className="border-t border-gray-100" /> : null}

      {isLoggedIn ? (
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2C3B2D]/10">
            <Check size={12} strokeWidth={2} className="text-[#2C3B2D]" />
          </div>
          <p className="text-xs text-gray-500">
            Your contact details are saved to your account.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <EyeOff size={15} strokeWidth={1.5} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">Book anonymously</p>
                  <p className="text-xs text-gray-500">Your real name stays private from your therapist</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !isAnonymous;
                  setIsAnonymous(next);
                  onUpdate({ isAnonymous: next });
                }}
                className={`relative flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  isAnonymous ? "bg-primary" : "bg-gray-200"
                }`}
                aria-pressed={isAnonymous}
                aria-label="Toggle anonymous booking"
              >
                <span
                  className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${
                    isAnonymous ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {isAnonymous ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Choose an alias</label>
                <input
                  {...register("alias")}
                  placeholder="e.g. Alex, Sunshine, or any name you prefer"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">This is what your therapist will call you</p>
                {errors.alias && (
                  <p className="mt-1 text-xs text-red-500">{errors.alias.message}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
                <input
                  {...register("fullName")}
                  placeholder="e.g. Amaka Obi"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">Your session link will be sent here</p>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">WhatsApp number</label>
              <input
                {...register("phone")}
                type="tel"
                placeholder="08012345678"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">For session reminders — we use WhatsApp</p>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-primary py-3.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Continue →
      </button>
    </form>
  );
}
