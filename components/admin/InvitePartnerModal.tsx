"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestReferralCodeFromName } from "@/lib/referral/slug";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export function InvitePartnerModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [tier, setTier] = useState<"standard" | "premium">("standard");
  const [feePerSession, setFeePerSession] = useState("3000");
  const [referralCode, setReferralCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const suggestedCode = useMemo(() => suggestReferralCodeFromName(name), [name]);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          contactName,
          email,
          phone,
          city,
          tier,
          referralCode: (referralCode || suggestedCode).toUpperCase(),
          feePerSession: Number(feePerSession),
          bankName: bankName || undefined,
          accountName: accountName || undefined,
          accountNumber: accountNumber || undefined,
        }),
      });
      const j = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !j.success) throw new Error(j.error ?? "Failed to create partner");
      onCreated?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create partner");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <h3 className="text-lg font-semibold">Add Referral Partner</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Clinic/organisation name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact name</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tier</Label>
              <select
                value={tier}
                onChange={(e) => {
                  const t = e.target.value === "premium" ? "premium" : "standard";
                  setTier(t);
                  setFeePerSession(t === "premium" ? "5000" : "3000");
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="standard">Standard (₦3,000)</option>
                <option value="premium">Premium (₦5,000)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Custom fee</Label>
              <Input
                value={feePerSession}
                onChange={(e) => setFeePerSession(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Referral code</Label>
            <Input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder={suggestedCode}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Bank name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Account name</Label>
              <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Account number</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting || !name || !contactName || !email || !phone || !city}>
              {submitting ? "Creating..." : "Create Partner"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
