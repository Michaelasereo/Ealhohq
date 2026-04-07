"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SK } from "@/lib/auth/pending-verify";
import { cn } from "@/lib/utils";
import {
  defaultTherapistEnrollDraft,
  SPECIALIZATION_OPTIONS,
  useBookingStore,
  type TherapistEnrollDraft,
} from "@/stores/bookingStore";

const step1Schema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .refine((v) => /\d/.test(v), "Password must contain a number"),
    confirmPassword: z.string(),
    phone: z.string().min(10, "Phone must be at least 10 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const step2Schema = z.object({
  specializations: z.array(z.string()).min(1, "Select at least one"),
  qualifications: z.array(z.string()).min(1, "Add at least one qualification"),
  bio: z
    .string()
    .min(50, "Bio must be at least 50 characters")
    .max(500, "Bio must be at most 500 characters"),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-6 flex gap-2">
      {[1, 2, 3, 4].map((s) => (
        <div
          key={s}
          className={cn(
            "h-2 flex-1 rounded-full",
            s <= step ? "bg-primary" : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

export default function TherapistEnrollPage() {
  const router = useRouter();
  const { therapistEnroll, setTherapistEnroll, setTherapistStep, resetTherapistEnroll } =
    useBookingStore();
  const [qualInput, setQualInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!therapistEnroll) {
      setTherapistEnroll(defaultTherapistEnrollDraft());
    }
  }, [therapistEnroll, setTherapistEnroll]);

  const draft = therapistEnroll ?? defaultTherapistEnrollDraft();
  const step = draft.step;

  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      fullName: draft.fullName,
      email: draft.email,
      password: draft.password,
      confirmPassword: draft.confirmPassword,
      phone: draft.phone,
    },
  });

  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      specializations: draft.specializations,
      qualifications: draft.qualifications,
      bio: draft.bio,
    },
  });

  useEffect(() => {
    if (step !== 1) return;
    form1.reset({
      fullName: draft.fullName,
      email: draft.email,
      password: draft.password,
      confirmPassword: draft.confirmPassword,
      phone: draft.phone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when returning to step 1
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    form2.reset({
      specializations: draft.specializations,
      qualifications: draft.qualifications,
      bio: draft.bio,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when entering step 2
  }, [step]);

  const onStep1 = (data: Step1) => {
    setTherapistEnroll({ ...data, step: 2 });
    setTherapistStep(2);
  };

  const onStep2 = (data: Step2) => {
    setTherapistEnroll({ ...data, step: 3 });
    setTherapistStep(3);
  };

  const goBack = () => {
    if (draft.step <= 1) return;
    const prev = (draft.step - 1) as TherapistEnrollDraft["step"];
    setTherapistStep(prev);
  };

  const addQualification = () => {
    const q = qualInput.trim();
    if (!q) return;
    form2.setValue("qualifications", [...form2.getValues("qualifications"), q], {
      shouldValidate: true,
    });
    setQualInput("");
  };

  const removeQualification = (i: number) => {
    const list = [...form2.getValues("qualifications")];
    list.splice(i, 1);
    form2.setValue("qualifications", list, { shouldValidate: true });
  };

  const onStep3Next = () => {
    setTherapistEnroll({ step: 4 });
    setTherapistStep(4);
  };

  const onFinalSubmit = async () => {
    if (!draft.consentTermsPrivacy || !draft.consentTherapistStandards) {
      setError("Please accept the Privacy Policy, Terms, and Therapist Standards.");
      return;
    }
    if (!draft.consentInfoAccurate) {
      setError("Please confirm that your information is accurate.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: draft.email.trim(),
        name: draft.fullName.trim(),
        type: "signup",
        signupRole: "therapist",
      }),
    });
    const json = (await res.json()) as { success?: boolean; error?: string };
    if (!json.success) {
      setError(json.error ?? "Could not send verification code");
      setSubmitting(false);
      return;
    }
    sessionStorage.setItem(SK.email, draft.email.trim());
    sessionStorage.setItem(SK.name, draft.fullName.trim());
    sessionStorage.setItem(SK.password, draft.password);
    sessionStorage.setItem(SK.role, "therapist");
    sessionStorage.setItem(SK.phone, draft.phone.trim());
    sessionStorage.setItem(SK.flow, "signup");
    sessionStorage.setItem(
      SK.consentTypes,
      JSON.stringify([
        "terms",
        "privacy",
        "therapist_standards",
        "accuracy",
      ]),
    );
    router.replace("/auth/verify");
    router.refresh();
    setSubmitting(false);
  };

  return (
    <div className="w-full space-y-6">
      <Progress step={step} />
      <Card className="border-border bg-white shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Therapist application</CardTitle>
          <CardDescription>Step {step} of 4</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <form key="step1" onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" className="h-12 min-h-[48px] text-base" {...form1.register("fullName")} />
                {form1.formState.errors.fullName && (
                  <p className="text-sm text-destructive">{form1.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" className="h-12 min-h-[48px] text-base" {...form1.register("email")} />
                {form1.formState.errors.email && (
                  <p className="text-sm text-destructive">{form1.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" className="h-12 min-h-[48px] text-base" {...form1.register("password")} />
                {form1.formState.errors.password && (
                  <p className="text-sm text-destructive">{form1.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input id="confirmPassword" type="password" className="h-12 min-h-[48px] text-base" {...form1.register("confirmPassword")} />
                {form1.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{form1.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" className="h-12 min-h-[48px] text-base" {...form1.register("phone")} />
                {form1.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form1.formState.errors.phone.message}</p>
                )}
              </div>
              <Button type="submit" className="h-12 min-h-[48px] w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Next
              </Button>
            </form>
          )}

          {step === 2 && (
            <form key="step2" onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Specializations</legend>
                <div className="grid gap-2">
                  {SPECIALIZATION_OPTIONS.map((opt) => (
                    <label key={opt} className="flex min-h-[48px] items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        className="size-5 accent-primary"
                        checked={form2.watch("specializations").includes(opt)}
                        onChange={(e) => {
                          const cur = form2.getValues("specializations");
                          if (e.target.checked) {
                            form2.setValue("specializations", [...cur, opt], { shouldValidate: true });
                          } else {
                            form2.setValue(
                              "specializations",
                              cur.filter((x) => x !== opt),
                              { shouldValidate: true },
                            );
                          }
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
                {form2.formState.errors.specializations && (
                  <p className="text-sm text-destructive">{form2.formState.errors.specializations.message}</p>
                )}
              </fieldset>
              <div className="space-y-2">
                <Label>Qualifications (type and press Enter)</Label>
                <div className="flex gap-2">
                  <Input
                    value={qualInput}
                    onChange={(e) => setQualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addQualification();
                      }
                    }}
                    className="h-12 min-h-[48px] text-base"
                    placeholder="e.g. MSc Clinical Psychology"
                  />
                  <Button type="button" variant="outline" className="h-12 shrink-0" onClick={addQualification}>
                    Add
                  </Button>
                </div>
                <ul className="space-y-1 text-sm">
                  {form2.watch("qualifications").map((q, i) => (
                    <li key={`${q}-${i}`} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                      <span>{q}</span>
                      <button type="button" className="text-destructive underline" onClick={() => removeQualification(i)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                {form2.formState.errors.qualifications && (
                  <p className="text-sm text-destructive">{form2.formState.errors.qualifications.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  rows={5}
                  className={cn(
                    "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  {...form2.register("bio")}
                />
                {form2.formState.errors.bio && (
                  <p className="text-sm text-destructive">{form2.formState.errors.bio.message}</p>
                )}
              </div>
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Session rate and duration are set by Ealho for all therapists after approval.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-12 flex-1" onClick={goBack}>
                  Back
                </Button>
                <Button type="submit" className="h-12 min-h-[48px] flex-[2] bg-primary text-primary-foreground hover:bg-primary/90">
                  Next
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="photo">Profile photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="h-12 min-h-[48px] cursor-pointer text-base file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      setTherapistEnroll({ profilePhotoBase64: null });
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const r = reader.result;
                      if (typeof r === "string") setTherapistEnroll({ profilePhotoBase64: r });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cert">Professional certificate</Label>
                <Input
                  id="cert"
                  type="file"
                  accept=".pdf,image/*"
                  className="h-12 min-h-[48px] cursor-pointer text-base file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setTherapistEnroll({ certificateFileName: file?.name ?? null });
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Documents will be reviewed during approval.</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-12 flex-1" onClick={goBack}>
                  Back
                </Button>
                <Button type="button" className="h-12 min-h-[48px] flex-[2] bg-primary text-primary-foreground hover:bg-primary/90" onClick={onStep3Next}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border p-3 space-y-2">
                <p><span className="font-medium">Name:</span> {draft.fullName}</p>
                <p><span className="font-medium">Email:</span> {draft.email}</p>
                <p><span className="font-medium">Phone:</span> {draft.phone}</p>
                <p><span className="font-medium">Specializations:</span> {draft.specializations.join(", ")}</p>
                <p><span className="font-medium">Qualifications:</span> {draft.qualifications.join("; ")}</p>
                <p><span className="font-medium">Bio:</span> {draft.bio}</p>
                <p className="text-muted-foreground">
                  Session rate and duration are set by Ealho after approval.
                </p>
                <p><span className="font-medium">Photo:</span> {draft.profilePhotoBase64 ? "Uploaded" : "Not uploaded"}</p>
                <p><span className="font-medium">Certificate:</span> {draft.certificateFileName ?? "Not uploaded"}</p>
              </div>
              <label className="flex min-h-[48px] cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-primary"
                  checked={draft.consentTermsPrivacy}
                  onChange={(e) =>
                    setTherapistEnroll({ consentTermsPrivacy: e.target.checked })
                  }
                />
                <span>
                  I have read and agree to the{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Terms of Service
                  </Link>
                  .
                </span>
              </label>
              <label className="flex min-h-[48px] cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-primary"
                  checked={draft.consentTherapistStandards}
                  onChange={(e) =>
                    setTherapistEnroll({
                      consentTherapistStandards: e.target.checked,
                    })
                  }
                />
                <span>
                  I have read and agree to the{" "}
                  <Link
                    href="/therapist-standards"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Therapist Standards and Code of Practice
                  </Link>
                  . I understand my obligations as a therapist on the Ealho platform.
                </span>
              </label>
              <label className="flex min-h-[48px] cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-5 accent-primary"
                  checked={draft.consentInfoAccurate}
                  onChange={(e) =>
                    setTherapistEnroll({ consentInfoAccurate: e.target.checked })
                  }
                />
                <span>
                  I confirm that all information I have provided is accurate and that I hold valid
                  professional qualifications as stated. I understand that providing false
                  information will result in immediate removal from the platform.
                </span>
              </label>
              {error && <p className="text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-12 flex-1" onClick={goBack}>
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  className="h-12 min-h-[48px] flex-[2] bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => void onFinalSubmit()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Submit application"
                  )}
                </Button>
              </div>
            </div>
          )}

          <p className="text-center text-sm">
            <Link href="/therapist/login" className="cursor-pointer text-primary underline">
              Already have an account? Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
