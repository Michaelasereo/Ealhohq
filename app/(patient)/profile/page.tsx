"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PatientMessagingPrivacyCard } from "@/components/patient/PatientMessagingPrivacyCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const genderOptions = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
] as const;

const personalSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  occupation: z.string().optional(),
});

const medicalSchema = z.object({
  currentMedications: z.string().optional(),
  allergies: z.string().optional(),
  previousDiagnoses: z.string().optional(),
  previousTherapy: z.string().optional(),
});

const familySchema = z.object({
  familyMedical: z.string().optional(),
  familyPsychiatric: z.string().optional(),
  familySubstanceUse: z.string().optional(),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type ProfileMe = {
  fullName: string;
  phone: string;
  email: string;
  profilePhoto: string | null;
  patient: null | {
    id: string;
    fullName: string;
    dateOfBirth: string | null;
    gender: string | null;
    occupation: string | null;
    medicalHistory: null | {
      currentMedications: string | null;
      allergies: string | null;
      previousDiagnoses: string | null;
      previousTherapy: string | null;
      familyMedical: string | null;
      familyPsychiatric: string | null;
      familySubstanceUse: string | null;
    };
  };
};

const textareaClass = cn(
  "min-h-[100px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base",
  "outline-none transition-colors placeholder:text-muted-foreground",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50",
  "aria-invalid:border-destructive",
);

function SavedBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="text-sm font-medium text-primary" role="status">
      Saved ✓
    </p>
  );
}

type ConsentRow = { consentType: string; consentedAt: string; version: string | null };

function consentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    ai_notes: "AI-assisted session notes",
    therapist_standards: "Therapist Standards",
    accuracy: "Information accuracy",
  };
  return map[type] ?? type;
}

export default function PatientProfilePage() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const [savedPersonal, setSavedPersonal] = useState(false);
  const [savedMedical, setSavedMedical] = useState(false);
  const [savedFamily, setSavedFamily] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const { data: consents, isLoading: consentsLoading } = useQuery({
    queryKey: ["patient-consents"],
    queryFn: async () => {
      const r = await fetch("/api/patient/consents", { credentials: "include" });
      const j = (await r.json()) as {
        success?: boolean;
        data?: ConsentRow[];
        error?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Failed to load consents");
      return j.data ?? [];
    },
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["patient-profile-me"],
    queryFn: async () => {
      const r = await fetch("/api/patient/profile/me", {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: ProfileMe;
        error?: string;
      };
      if (!r.ok) throw new Error(j.error ?? "Failed to load profile");
      return j.data!;
    },
  });

  const patchMut = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const r = await fetch("/api/patient/profile/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      if (!j.success) throw new Error("Save failed");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["patient-profile-me"] });
    },
  });

  const personalForm = useForm<z.infer<typeof personalSchema>>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      occupation: "",
    },
  });

  const medicalForm = useForm<z.infer<typeof medicalSchema>>({
    resolver: zodResolver(medicalSchema),
    defaultValues: {
      currentMedications: "",
      allergies: "",
      previousDiagnoses: "",
      previousTherapy: "",
    },
  });

  const familyForm = useForm<z.infer<typeof familySchema>>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      familyMedical: "",
      familyPsychiatric: "",
      familySubstanceUse: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  useEffect(() => {
    if (!data) return;
    const p = data.patient;
    const mh = p?.medicalHistory;
    personalForm.reset({
      fullName: data.fullName || p?.fullName || "",
      phone: data.phone ?? "",
      dateOfBirth: p?.dateOfBirth ?? "",
      gender: p?.gender ?? "",
      occupation: p?.occupation ?? "",
    });
    medicalForm.reset({
      currentMedications: mh?.currentMedications ?? "",
      allergies: mh?.allergies ?? "",
      previousDiagnoses: mh?.previousDiagnoses ?? "",
      previousTherapy: mh?.previousTherapy ?? "",
    });
    familyForm.reset({
      familyMedical: mh?.familyMedical ?? "",
      familyPsychiatric: mh?.familyPsychiatric ?? "",
      familySubstanceUse: mh?.familySubstanceUse ?? "",
    });
  }, [data, personalForm, medicalForm, familyForm]);

  async function onSavePersonal(values: z.infer<typeof personalSchema>) {
    await patchMut.mutateAsync({
      fullName: values.fullName.trim(),
      phone: values.phone?.trim() || null,
      dateOfBirth: values.dateOfBirth || null,
      gender: values.gender || null,
      occupation: values.occupation?.trim() || null,
    });
  }

  async function onSaveMedical(values: z.infer<typeof medicalSchema>) {
    await patchMut.mutateAsync({
      currentMedications: values.currentMedications?.trim() || null,
      allergies: values.allergies?.trim() || null,
      previousDiagnoses: values.previousDiagnoses?.trim() || null,
      previousTherapy: values.previousTherapy?.trim() || null,
    });
  }

  async function onSaveFamily(values: z.infer<typeof familySchema>) {
    await patchMut.mutateAsync({
      familyMedical: values.familyMedical?.trim() || null,
      familyPsychiatric: values.familyPsychiatric?.trim() || null,
      familySubstanceUse: values.familySubstanceUse?.trim() || null,
    });
  }

  async function onPassword(values: z.infer<typeof passwordSchema>) {
    setPasswordMsg(null);
    const { error: e } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (e) {
      setPasswordMsg({ type: "err", text: e.message });
      return;
    }
    passwordForm.reset();
    setPasswordMsg({ type: "ok", text: "Password updated." });
    window.setTimeout(() => setPasswordMsg(null), 4000);
  }

  async function signOutAll() {
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/login";
  }

  async function downloadDataExport() {
    setExportBusy(true);
    try {
      const r = await fetch("/api/patient/data-export", {
        method: "POST",
        credentials: "include",
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: unknown;
        error?: string;
      };
      if (!r.ok || !j.success || j.data === undefined) {
        throw new Error(j.error ?? "Export failed");
      }
      const blob = new Blob([JSON.stringify(j.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ealho-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportBusy(false);
    }
  }

  async function submitDeleteAccount() {
    setDeleteErr(null);
    if (deleteConfirm !== "DELETE") {
      setDeleteErr('Type DELETE exactly to confirm.');
      return;
    }
    setDeleteBusy(true);
    try {
      const r = await fetch("/api/patient/delete-account", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) {
        throw new Error(j.error ?? "Could not delete account");
      }
      window.location.href = "/login";
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : "Could not delete account");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-4 p-4 pb-24 md:pb-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-lg p-4 pb-24 md:pb-8">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Could not load profile"}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg space-y-6 p-4 pb-24 md:pb-8">
      <header>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your details are stored securely and shared only with your care team.
        </p>
      </header>

      <Accordion
        multiple
        defaultValue={["personal"]}
        className="rounded-xl border border-border px-2"
      >
        <AccordionItem value="personal">
          <AccordionTrigger>Personal details</AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pb-4">
            <form
              className="space-y-3"
              onSubmit={personalForm.handleSubmit(async (values) => {
                try {
                  await onSavePersonal(values);
                  setSavedPersonal(true);
                  window.setTimeout(() => setSavedPersonal(false), 3000);
                } catch {
                  /* patchMut surfaces error */
                }
              })}
            >
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  className="min-h-12"
                  {...personalForm.register("fullName")}
                  aria-invalid={!!personalForm.formState.errors.fullName}
                />
                {personalForm.formState.errors.fullName ? (
                  <p className="mt-1 text-xs text-destructive">
                    {personalForm.formState.errors.fullName.message}
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  className="min-h-12"
                  value={data?.email ?? ""}
                  disabled
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  className="min-h-12"
                  {...personalForm.register("phone")}
                />
              </div>
              <div>
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  className="min-h-12"
                  {...personalForm.register("dateOfBirth")}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  className={cn(
                    "min-h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base",
                    "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  {...personalForm.register("gender")}
                >
                  <option value="">Select…</option>
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  className="min-h-12"
                  {...personalForm.register("occupation")}
                />
              </div>
              <SavedBanner show={savedPersonal} />
              {patchMut.isError ? (
                <p className="text-sm text-destructive">
                  {patchMut.error instanceof Error
                    ? patchMut.error.message
                    : "Save failed"}
                </p>
              ) : null}
              <Button
                type="submit"
                variant="default"
                className="min-h-12 w-full"
                disabled={patchMut.isPending}
              >
                {patchMut.isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="medical">
          <AccordionTrigger>Medical history</AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pb-4">
            <form
              className="space-y-3"
              onSubmit={medicalForm.handleSubmit(async (values) => {
                try {
                  await onSaveMedical(values);
                  setSavedMedical(true);
                  window.setTimeout(() => setSavedMedical(false), 3000);
                } catch {
                  /* patchMut surfaces error */
                }
              })}
            >
              <div>
                <Label htmlFor="meds">Current medications</Label>
                <textarea
                  id="meds"
                  className={textareaClass}
                  {...medicalForm.register("currentMedications")}
                />
              </div>
              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <textarea
                  id="allergies"
                  className={textareaClass}
                  {...medicalForm.register("allergies")}
                />
              </div>
              <div>
                <Label htmlFor="dx">Previous diagnoses</Label>
                <textarea
                  id="dx"
                  className={textareaClass}
                  {...medicalForm.register("previousDiagnoses")}
                />
              </div>
              <div>
                <Label htmlFor="therapy">Previous therapy history</Label>
                <textarea
                  id="therapy"
                  className={textareaClass}
                  {...medicalForm.register("previousTherapy")}
                />
              </div>
              <SavedBanner show={savedMedical} />
              <Button
                type="submit"
                variant="default"
                className="min-h-12 w-full"
                disabled={patchMut.isPending}
              >
                {patchMut.isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="family">
          <AccordionTrigger>Family history</AccordionTrigger>
          <AccordionContent className="space-y-3 px-1 pb-4">
            <form
              className="space-y-3"
              onSubmit={familyForm.handleSubmit(async (values) => {
                try {
                  await onSaveFamily(values);
                  setSavedFamily(true);
                  window.setTimeout(() => setSavedFamily(false), 3000);
                } catch {
                  /* patchMut surfaces error */
                }
              })}
            >
              <div>
                <Label htmlFor="famMed">Family medical history</Label>
                <textarea
                  id="famMed"
                  className={textareaClass}
                  {...familyForm.register("familyMedical")}
                />
              </div>
              <div>
                <Label htmlFor="famPsych">Family psychiatric history</Label>
                <textarea
                  id="famPsych"
                  className={textareaClass}
                  {...familyForm.register("familyPsychiatric")}
                />
              </div>
              <div>
                <Label htmlFor="famSub">Family substance use history</Label>
                <textarea
                  id="famSub"
                  className={textareaClass}
                  {...familyForm.register("familySubstanceUse")}
                />
              </div>
              <SavedBanner show={savedFamily} />
              <Button
                type="submit"
                variant="default"
                className="min-h-12 w-full"
                disabled={patchMut.isPending}
              >
                {patchMut.isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy-data">
          <AccordionTrigger>Privacy &amp; data</AccordionTrigger>
          <AccordionContent className="space-y-4 px-1 pb-4">
            <p className="text-sm text-muted-foreground">
              See our{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline"
              >
                Terms of Service
              </a>{" "}
              for how we handle your information.
            </p>
            <div>
              <p className="text-sm font-medium">Download your data</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Receive a JSON copy of your profile, bookings, and credit activity (SOAP notes are
                never included).
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 min-h-12 w-full"
                disabled={exportBusy}
                onClick={() => void downloadDataExport()}
              >
                {exportBusy ? "Preparing…" : "Download JSON export"}
              </Button>
            </div>
            <div>
              <p className="text-sm font-medium">Consent history</p>
              {consentsLoading ? (
                <Skeleton className="mt-2 h-20 w-full" />
              ) : !consents?.length ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No recorded consents yet. They appear when you accept policies during sign-up or
                  booking.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  {consents.map((c, i) => (
                    <li key={`${c.consentType}-${c.consentedAt}-${i}`} className="flex flex-col gap-0.5">
                      <span className="font-medium">{consentTypeLabel(c.consentType)}</span>
                      <span className="text-muted-foreground">
                        {new Date(c.consentedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {c.version ? ` · v${c.version}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive">Delete account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This will anonymize your profile and sign you out. This cannot be undone from the
                app.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-12 w-full border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setDeleteErr(null);
                  setDeleteConfirm("");
                  setDeleteDialogOpen(true);
                }}
              >
                Delete my account…
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="account">
          <AccordionTrigger>Account &amp; security</AccordionTrigger>
          <AccordionContent className="space-y-6 px-1 pb-4">
            <PatientMessagingPrivacyCard />
            <form
              className="space-y-3"
              onSubmit={passwordForm.handleSubmit(onPassword)}
            >
              <p className="text-sm font-medium">Change password</p>
              <div>
                <Label htmlFor="npw">New password</Label>
                <Input
                  id="npw"
                  type="password"
                  autoComplete="new-password"
                  className="min-h-12"
                  {...passwordForm.register("password")}
                  aria-invalid={!!passwordForm.formState.errors.password}
                />
                {passwordForm.formState.errors.password ? (
                  <p className="mt-1 text-xs text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="cpw">Confirm password</Label>
                <Input
                  id="cpw"
                  type="password"
                  autoComplete="new-password"
                  className="min-h-12"
                  {...passwordForm.register("confirm")}
                  aria-invalid={!!passwordForm.formState.errors.confirm}
                />
                {passwordForm.formState.errors.confirm ? (
                  <p className="mt-1 text-xs text-destructive">
                    {passwordForm.formState.errors.confirm.message}
                  </p>
                ) : null}
              </div>
              {passwordMsg ? (
                <p
                  className={
                    passwordMsg.type === "ok"
                      ? "text-sm text-primary"
                      : "text-sm text-destructive"
                  }
                >
                  {passwordMsg.text}
                </p>
              ) : null}
              <Button type="submit" variant="outline" className="min-h-12 w-full">
                Update password
              </Button>
            </form>

            <div className="border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 w-full"
                onClick={() => void signOutAll()}
              >
                Sign out of all devices
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteConfirm("");
            setDeleteErr(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will anonymize your data and sign you out. Type{" "}
              <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-4 pb-2">
            <Label htmlFor="delete-confirm">Confirmation</Label>
            <Input
              id="delete-confirm"
              className="min-h-12 font-mono"
              autoComplete="off"
              placeholder="DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            {deleteErr ? (
              <p className="text-sm text-destructive" role="alert">
                {deleteErr}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteBusy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-12"
              disabled={deleteBusy || deleteConfirm !== "DELETE"}
              onClick={() => void submitDeleteAccount()}
            >
              {deleteBusy ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
