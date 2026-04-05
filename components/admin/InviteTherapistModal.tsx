"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

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
import { SPECIALIZATION_OPTIONS } from "@/stores/bookingStore";

export function InviteTherapistModal({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInvited?: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionRate, setSessionRate] = useState(15000);
  const [sessionDuration, setSessionDuration] = useState<50 | 60 | 90>(50);
  const [bio, setBio] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  const [quals, setQuals] = useState<string[]>([]);
  const [qualInput, setQualInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const toggleSpec = (s: string) => {
    setSpecs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const addQual = () => {
    const t = qualInput.trim();
    if (!t) return;
    setQuals((q) => [...q, t]);
    setQualInput("");
  };

  const submit = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/admin/invite/therapist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        specializations: specs,
        sessionRate,
        sessionDuration,
        bio: bio.trim() || null,
        qualifications: quals,
      }),
    });
    const json = (await res.json()) as { success?: boolean; error?: string };
    setLoading(false);
    if (!res.ok || !json.success) {
      setErr(json.error ?? "Failed to send invite");
      return;
    }
    setMsg(`Invite sent to ${email.trim()} ✓`);
    onInvited?.();
    window.setTimeout(() => {
      onOpenChange(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setSpecs([]);
      setQuals([]);
      setBio("");
      setMsg(null);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite therapist</DialogTitle>
          <DialogDescription>
            They&apos;ll receive a code and setup link by email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-1 py-2">
          <div className="space-y-2">
            <Label htmlFor="it-name">Full name</Label>
            <Input
              id="it-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 min-h-[48px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-email">Email</Label>
            <Input
              id="it-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 min-h-[48px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-phone">Phone (optional, WhatsApp invite)</Label>
            <Input
              id="it-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 min-h-[48px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Specializations</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATION_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={specs.includes(opt)}
                    onChange={() => toggleSpec(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-rate">Session rate (NGN)</Label>
            <Input
              id="it-rate"
              type="number"
              min={0}
              value={sessionRate}
              onChange={(e) => setSessionRate(Number(e.target.value))}
              className="h-12 min-h-[48px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Session duration</Label>
            <div className="flex flex-wrap gap-3">
              {([50, 60, 90] as const).map((m) => (
                <label
                  key={m}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="dur"
                    checked={sessionDuration === m}
                    onChange={() => setSessionDuration(m)}
                  />
                  {m} min
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="it-bio">Bio (optional)</Label>
            <textarea
              id="it-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Qualifications (optional)</Label>
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
                placeholder="Add qualification"
                className="h-12 min-h-[48px]"
              />
              <Button type="button" variant="secondary" onClick={addQual}>
                Add
              </Button>
            </div>
            {quals.length > 0 && (
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {quals.map((q) => (
                  <li key={q}>
                    {q}{" "}
                    <button
                      type="button"
                      className="text-destructive underline"
                      onClick={() => setQuals((x) => x.filter((y) => y !== q))}
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {msg && <p className="text-sm text-primary">{msg}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={loading || !fullName.trim() || !email.trim()}
            className="h-12 w-full sm:w-auto"
            onClick={submit}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.5} />
                Sending…
              </>
            ) : (
              "Send invite"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
