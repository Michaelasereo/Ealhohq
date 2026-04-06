"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ProfilePhotoUpload } from "@/components/shared/ProfilePhotoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatNgn } from "@/lib/format-ngn";
import { cn } from "@/lib/utils";

const SPECIALIZATIONS = [
  "Anxiety",
  "Depression",
  "Trauma & PTSD",
  "Grief",
  "Relationships",
  "Work Stress",
  "CBT",
  "DBT",
  "Addiction",
  "Eating Disorders",
  "OCD",
  "Other",
] as const;

type Me = {
  fullName: string;
  email: string | null;
  profilePhoto: string | null;
  bio: string | null;
  specializations: string[];
  qualifications: string[];
  sessionRate: number;
  sessionDuration: number;
  phone: string | null;
};

async function fetchMe(): Promise<Me> {
  const r = await fetch("/api/therapist/profile/me", { credentials: "include" });
  const j = (await r.json()) as { success?: boolean; data?: Me; error?: string };
  if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "Failed to load");
  return j.data;
}

function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors",
          on ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-background shadow transition-transform",
            on ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

export default function TherapistSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["therapist-profile-me"],
    queryFn: fetchMe,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [quals, setQuals] = useState<string[]>([]);
  const [qualInput, setQualInput] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [n1, setN1] = useState(true);
  const [n2, setN2] = useState(true);
  const [n3, setN3] = useState(true);
  const [n4, setN4] = useState(true);
  const [n5, setN5] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFullName(data.fullName);
    setPhone(data.phone ?? "");
    setBio(data.bio ?? "");
    setSpecs(data.specializations ?? []);
    setQuals(data.qualifications ?? []);
  }, [data]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/therapist/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          specializations: specs,
          qualifications: quals,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["therapist-profile-me"] });
      void qc.invalidateQueries({ queryKey: ["therapist-dashboard"] });
    },
  });

  const deactivate = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/therapist/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileStatus: "inactive" }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not deactivate");
    },
    onSuccess: () => {
      window.location.href = "/therapist/login";
    },
  });

  async function changePassword() {
    setPwMsg(null);
    if (pw1.length < 8) {
      setPwMsg("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      setPwMsg("Passwords do not match.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) {
      setPwMsg(error.message);
      return;
    }
    setPw1("");
    setPw2("");
    setPwMsg("Password updated.");
  }

  function toggleSpec(s: string) {
    setSpecs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function addQual() {
    const t = qualInput.trim();
    if (!t) return;
    setQuals((q) => [...q, t]);
    setQualInput("");
  }

  if (isLoading || !data) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-4 pb-20">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-4 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Profile, practice, and account (WAT scheduling elsewhere).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Photo and contact shown to clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfilePhotoUpload currentPhoto={data.profilePhoto} />
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="min-h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={data.email ?? ""} disabled className="min-h-12 bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button
            type="button"
            className="min-h-12 w-full sm:w-auto"
            disabled={saveProfile.isPending}
            onClick={() => saveProfile.mutate()}
          >
            {saveProfile.isPending ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Practice details</CardTitle>
          <CardDescription>Specialties and qualifications. Rate and duration are set by Ealho.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-foreground">Session rate</Label>
            <p className="text-sm text-muted-foreground">
              {formatNgn(data.sessionRate)} per session
            </p>
            <p className="text-xs text-muted-foreground">Session rate is set by Ealho</p>
          </div>
          <div className="space-y-1">
            <Label className="text-foreground">Session duration</Label>
            <p className="text-sm text-muted-foreground">{data.sessionDuration} minutes</p>
            <p className="text-xs text-muted-foreground">Session duration is set by Ealho</p>
          </div>
          <div className="space-y-2">
            <Label>Specializations</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpec(s)}
                  className={cn(
                    "min-h-10 rounded-full border px-3 py-1 text-sm",
                    specs.includes(s)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Qualifications</Label>
            <ul className="space-y-1 text-sm">
              {quals.map((q, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                  <span>{q}</span>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => setQuals((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={qualInput}
                onChange={(e) => setQualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addQual();
                  }
                }}
                placeholder="Add qualification, Enter"
                className="min-h-12"
              />
              <Button type="button" variant="secondary" className="min-h-12" onClick={addQual}>
                Add
              </Button>
            </div>
          </div>
          <Button
            type="button"
            className="min-h-12 w-full sm:w-auto"
            disabled={saveProfile.isPending}
            onClick={() => saveProfile.mutate()}
          >
            {saveProfile.isPending ? "Saving…" : "Save practice details"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Notification delivery coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <ToggleRow
            label="Email reminder when session booked"
            on={n1}
            onToggle={() => setN1((v) => !v)}
          />
          <ToggleRow
            label="WhatsApp reminder 24h before session"
            on={n2}
            onToggle={() => setN2((v) => !v)}
          />
          <ToggleRow
            label="WhatsApp reminder 1h before session"
            on={n3}
            onToggle={() => setN3((v) => !v)}
          />
          <ToggleRow
            label="Email when notes are ready"
            on={n4}
            onToggle={() => setN4((v) => !v)}
          />
          <ToggleRow
            label="Weekly summary email"
            on={n5}
            onToggle={() => setN5((v) => !v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <Input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              className="min-h-12"
              autoComplete="new-password"
            />
            <Input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="min-h-12"
              placeholder="Confirm"
              autoComplete="new-password"
            />
            {pwMsg ? (
              <p className={cn("text-sm", pwMsg.includes("updated") ? "text-emerald-600" : "text-destructive")}>
                {pwMsg}
              </p>
            ) : null}
            <Button type="button" className="min-h-12" onClick={() => void changePassword()}>
              Update password
            </Button>
          </div>
          <div className="rounded-xl border border-destructive/30 p-4">
            <p className="mb-2 text-sm font-medium text-destructive">Danger zone</p>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full border-destructive text-destructive hover:bg-destructive/10"
              disabled={deactivate.isPending}
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  window.confirm(
                    "This will disable your account. Contact support to reactivate.",
                  )
                ) {
                  deactivate.mutate();
                }
              }}
            >
              {deactivate.isPending ? "Deactivating…" : "Deactivate account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
