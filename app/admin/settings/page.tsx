"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type SettingsPayload = {
  platformName: string;
  supportEmail: string;
  defaultSessionRateNgn: number;
  defaultSessionDuration: number;
  bookingWindowWeeks: number;
  minimumNoticeHours: number;
  paystackPublicKeyMasked: string;
  paystackSecretKeyMasked: string;
};

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [form, setForm] = useState<SettingsPayload | null>(null);
  const [adminName, setAdminName] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [paystackPublicNew, setPaystackPublicNew] = useState("");
  const [paystackSecretNew, setPaystackSecretNew] = useState("");
  const [paystackSource, setPaystackSource] = useState<{
    publicFromDb: boolean;
    secretFromDb: boolean;
  } | null>(null);
  const [paystackSaving, setPaystackSaving] = useState(false);

  const loadSettings = async () => {
    const res = await fetch("/api/admin/settings", { credentials: "include" });
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        settings: SettingsPayload;
        adminName: string;
        adminEmail: string;
        paystackSource?: { publicFromDb: boolean; secretFromDb: boolean };
      };
    };
    if (res.ok && json.data) {
      setForm(json.data.settings);
      setAdminName(json.data.adminName);
      setAdminEmail(json.data.adminEmail);
      setPaystackSource(
        json.data.paystackSource ?? {
          publicFromDb: false,
          secretFromDb: false,
        },
      );
    }
  };

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadSettings();
      setLoading(false);
    })();
  }, []);

  const savePlatform = async () => {
    if (!form) return;
    setSaving(true);
    setErr(null);
    setOk(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        adminName: adminName.trim(),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setErr("Could not save settings");
      return;
    }
    setOk("Saved.");
  };

  const testPaystack = async () => {
    setTestLoading(true);
    setErr(null);
    setOk(null);
    const res = await fetch("/api/admin/paystack/test", {
      method: "POST",
      credentials: "include",
    });
    const json = (await res.json()) as { success?: boolean; error?: string };
    setTestLoading(false);
    if (!res.ok || !json.success) {
      setErr(json.error ?? "Paystack test failed");
      return;
    }
    setOk("Paystack secret key is valid.");
  };

  const savePaystackKeys = async () => {
    if (!paystackPublicNew.trim() && !paystackSecretNew.trim()) {
      setErr("Enter at least one key to save, or use Clear stored keys.");
      return;
    }
    setPaystackSaving(true);
    setErr(null);
    setOk(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paystackPublicKey: paystackPublicNew.trim() || undefined,
        paystackSecretKey: paystackSecretNew.trim() || undefined,
      }),
    });
    setPaystackSaving(false);
    if (!res.ok) {
      setErr("Could not save Paystack keys");
      return;
    }
    setPaystackPublicNew("");
    setPaystackSecretNew("");
    setOk("Paystack keys saved. Server routes will use these before env.");
    await loadSettings();
  };

  const clearPaystackKeys = async () => {
    setPaystackSaving(true);
    setErr(null);
    setOk(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearPaystackKeys: true }),
    });
    setPaystackSaving(false);
    if (!res.ok) {
      setErr("Could not clear stored keys");
      return;
    }
    setOk("Stored Paystack keys removed. Environment variables apply again.");
    await loadSettings();
  };

  const changePassword = async () => {
    if (newPw.length < 8 || !/\d/.test(newPw)) {
      setErr("Password must be at least 8 characters and include a number");
      return;
    }
    if (newPw !== confirmPw) {
      setErr("Passwords do not match");
      return;
    }
    setPwLoading(true);
    setErr(null);
    setOk(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setNewPw("");
    setConfirmPw("");
    setOk("Password updated.");
  };

  if (loading || !form) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Loading settings…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Platform defaults and your admin account.
        </p>
      </div>

      {err && (
        <p className="text-sm text-destructive" role="alert">
          {err}
        </p>
      )}
      {ok && <p className="text-sm text-primary">{ok}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Platform</CardTitle>
          <CardDescription>
            Defaults for booking and pricing (stored in database).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Platform name</Label>
            <Input
              value={form.platformName}
              onChange={(e) =>
                setForm({ ...form, platformName: e.target.value })
              }
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Support email</Label>
            <Input
              value={form.supportEmail}
              onChange={(e) =>
                setForm({ ...form, supportEmail: e.target.value })
              }
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Default session rate (NGN)</Label>
            <Input
              type="number"
              value={form.defaultSessionRateNgn}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultSessionRateNgn: Number(e.target.value),
                })
              }
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Default session duration (minutes)</Label>
            <Input
              type="number"
              value={form.defaultSessionDuration}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultSessionDuration: Number(e.target.value),
                })
              }
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Booking window (weeks)</Label>
            <Input
              type="number"
              value={form.bookingWindowWeeks}
              onChange={(e) =>
                setForm({
                  ...form,
                  bookingWindowWeeks: Number(e.target.value),
                })
              }
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum notice (hours)</Label>
            <Input
              type="number"
              value={form.minimumNoticeHours}
              onChange={(e) =>
                setForm({
                  ...form,
                  minimumNoticeHours: Number(e.target.value),
                })
              }
              className="h-12"
            />
          </div>
          <Button
            className="h-12"
            disabled={saving}
            onClick={() => void savePlatform()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.5} />
                Saving…
              </>
            ) : (
              "Save platform settings"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment (Paystack)</CardTitle>
          <CardDescription>
            Stored keys override environment variables for server verification,
            webhooks, and payment initialization. Public key in DB is optional
            (secret is required for those routes). For production, prefer env or
            a secrets manager; DB storage is convenient for staging.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {paystackSource && (
            <p className="text-muted-foreground text-xs">
              Active source — public:{" "}
              {paystackSource.publicFromDb ? "database" : "env"} · secret:{" "}
              {paystackSource.secretFromDb ? "database" : "env"}
            </p>
          )}
          <div className="space-y-2">
            <Label>Effective public key (masked)</Label>
            <Input readOnly value={form.paystackPublicKeyMasked} className="h-12 bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>Effective secret key (masked)</Label>
            <Input readOnly value={form.paystackSecretKeyMasked} className="h-12 bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label>New public key (optional)</Label>
            <Input
              value={paystackPublicNew}
              onChange={(e) => setPaystackPublicNew(e.target.value)}
              placeholder="pk_test_…"
              className="h-12 font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label>New secret key (optional)</Label>
            <Input
              type="password"
              value={paystackSecretNew}
              onChange={(e) => setPaystackSecretNew(e.target.value)}
              placeholder="sk_test_…"
              className="h-12 font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="h-12"
              disabled={paystackSaving}
              onClick={() => void savePaystackKeys()}
            >
              {paystackSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.5} />
                  Saving…
                </>
              ) : (
                "Save Paystack keys"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12"
              disabled={paystackSaving}
              onClick={() => void clearPaystackKeys()}
            >
              Clear stored keys
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-12"
              disabled={testLoading}
              onClick={() => void testPaystack()}
            >
              {testLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.5} />
                  Testing…
                </>
              ) : (
                "Test Paystack connection"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin account</CardTitle>
          <CardDescription>Profile name and password for this login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input readOnly value={adminEmail} className="h-12 bg-muted/50" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-12"
            disabled={saving}
            onClick={() => void savePlatform()}
          >
            Save name
          </Button>
          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium">Change password</p>
            <div className="space-y-2">
              <Label>New password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="h-12"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2 pt-2">
              <Label>Confirm password</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="h-12"
                autoComplete="new-password"
              />
            </div>
            <Button
              type="button"
              className="mt-3 h-12"
              disabled={pwLoading}
              onClick={() => void changePassword()}
            >
              {pwLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={1.5} />
                  Updating…
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
