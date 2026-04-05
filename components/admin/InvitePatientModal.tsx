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

export function InvitePatientModal({
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
  const [initialCredits, setInitialCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/admin/invite/patient", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        initialCredits,
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
      setInitialCredits(0);
      setMsg(null);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite patient</DialogTitle>
          <DialogDescription>
            They&apos;ll receive a verification code and setup link.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-1 py-2">
          <div className="space-y-2">
            <Label htmlFor="ip-name">Full name</Label>
            <Input
              id="ip-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-12 min-h-[48px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-email">Email</Label>
            <Input
              id="ip-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 min-h-[48px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-phone">Phone (optional)</Label>
            <Input
              id="ip-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 min-h-[48px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip-credits">Initial credits</Label>
            <Input
              id="ip-credits"
              type="number"
              min={0}
              value={initialCredits}
              onChange={(e) => setInitialCredits(Number(e.target.value))}
              className="h-12 min-h-[48px]"
            />
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
