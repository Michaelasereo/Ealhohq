"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

const DEFAULT_MODAL_TITLE = "Get your free burnout guide";
const DEFAULT_MODAL_SUBTITLE =
  "Enter your name and email — we’ll send you the PDF by email right away.";
const DEFAULT_MODAL_SUCCESS =
  "You’re all set. Check your inbox for the PDF (and your spam folder if you don’t see it).";

export function SiteContentSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const [heroText, setHeroText] = useState("Get a free burnout guide");
  const [burnoutLandingText, setBurnoutLandingText] = useState("");
  const [modalTitle, setModalTitle] = useState(DEFAULT_MODAL_TITLE);
  const [modalSubtitle, setModalSubtitle] = useState(DEFAULT_MODAL_SUBTITLE);
  const [modalSuccess, setModalSuccess] = useState(DEFAULT_MODAL_SUCCESS);
  const [emailFilename, setEmailFilename] = useState("Ealho-burnout-guide.pdf");

  const [freebieStatus, setFreebieStatus] = useState<{
    configured: boolean;
    bucket: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pubRes, adminRes] = await Promise.all([
        fetch(
          "/api/site-config?keys=hero_cta_secondary_text,burnout_landing_button_text,burnout_modal_title,burnout_modal_subtitle,burnout_modal_success_message",
        ),
        fetch("/api/admin/burnout-freebie", { credentials: "include" }),
      ]);
      const pubJson = (await pubRes.json()) as { data?: Record<string, string | null> };
      if (pubJson.data?.hero_cta_secondary_text)
        setHeroText(pubJson.data.hero_cta_secondary_text);
      if (pubJson.data?.burnout_landing_button_text)
        setBurnoutLandingText(pubJson.data.burnout_landing_button_text);
      if (pubJson.data?.burnout_modal_title?.trim())
        setModalTitle(pubJson.data.burnout_modal_title.trim());
      else setModalTitle(DEFAULT_MODAL_TITLE);
      if (pubJson.data?.burnout_modal_subtitle?.trim())
        setModalSubtitle(pubJson.data.burnout_modal_subtitle.trim());
      else setModalSubtitle(DEFAULT_MODAL_SUBTITLE);
      if (pubJson.data?.burnout_modal_success_message?.trim())
        setModalSuccess(pubJson.data.burnout_modal_success_message.trim());
      else setModalSuccess(DEFAULT_MODAL_SUCCESS);

      if (adminRes.ok) {
        const adminJson = (await adminRes.json()) as {
          data?: { configured?: boolean; emailFilename?: string; bucket?: string };
        };
        if (adminJson.data) {
          setFreebieStatus({
            configured: Boolean(adminJson.data.configured),
            bucket: adminJson.data.bucket ?? "freebies",
          });
          if (adminJson.data.emailFilename) setEmailFilename(adminJson.data.emailFilename);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveCopy = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configs: [
            { key: "hero_cta_secondary_text", value: heroText },
            { key: "burnout_landing_button_text", value: burnoutLandingText.trim() },
            { key: "burnout_modal_title", value: modalTitle.trim() },
            { key: "burnout_modal_subtitle", value: modalSubtitle.trim() },
            { key: "burnout_modal_success_message", value: modalSuccess.trim() },
            {
              key: "burnout_freebie_email_filename",
              value: (emailFilename.trim() || "Ealho-burnout-guide.pdf")
                .replace(/[^a-zA-Z0-9._-]+/g, "-")
                .slice(0, 120),
            },
          ],
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Could not save copy settings.");
        return;
      }
      setMessage("Copy settings saved.");
    } finally {
      setSaving(false);
    }
  };

  const uploadPdf = async () => {
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      input?.click();
      setError("Choose a PDF first, then click Upload PDF.");
      return;
    }
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("emailFilename", emailFilename.trim() || "Ealho-burnout-guide.pdf");
      const res = await fetch("/api/admin/burnout-freebie", {
        method: "POST",
        credentials: "include",
        body: fd,
      });

      let serverError: string | undefined;
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const json = (await res.json()) as { error?: string };
        serverError = json.error;
      } else {
        const text = await res.text();
        if (text.trim()) serverError = text.slice(0, 300);
      }

      if (!res.ok) {
        setError(serverError ?? "Upload failed.");
        return;
      }
      input.value = "";
      setSelectedFileName("");
      setMessage("PDF uploaded successfully.");
      void load();
    } catch (e) {
      console.error("Freebie upload failed:", e);
      setError("Upload failed. Check your internet/auth session and try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading site content…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Burnout guide &amp; hero CTA</CardTitle>
          <CardDescription>
            The hero and burnout page open a lead modal; Resend emails the PDF you upload here.
            Create a Supabase Storage bucket named{" "}
            <code className="rounded bg-muted px-1 text-xs">{freebieStatus?.bucket ?? "freebies"}</code>{" "}
            (or set <code className="rounded bg-muted px-1 text-xs">SUPABASE_FREEBIES_BUCKET</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Hero secondary button label</Label>
            <Input
              value={heroText}
              onChange={(e) => setHeroText(e.target.value)}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Burnout page button label (optional)</Label>
            <Input
              value={burnoutLandingText}
              onChange={(e) => setBurnoutLandingText(e.target.value)}
              placeholder="Leave blank to use the hero label"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Modal title</Label>
            <Input
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              placeholder="e.g. Get your free burnout guide"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label>Modal subtitle</Label>
            <textarea
              value={modalSubtitle}
              onChange={(e) => setModalSubtitle(e.target.value)}
              placeholder="Shown under the title before the form"
              rows={3}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>Success message</Label>
            <textarea
              value={modalSuccess}
              onChange={(e) => setModalSuccess(e.target.value)}
              placeholder="After submit. Optional placeholders: {email}, {name}"
              rows={3}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <Button type="button" className="h-12" disabled={saving} onClick={() => void saveCopy()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save copy"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Freebie PDF</CardTitle>
          <CardDescription>
            Upload replaces the file used for every download email. Attachment name is what
            recipients see in their mail app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">
              {freebieStatus?.configured ? "PDF configured" : "No PDF uploaded yet"}
            </span>
          </p>
          <div className="space-y-2">
            <Label>PDF attachment filename</Label>
            <Input
              value={emailFilename}
              onChange={(e) => setEmailFilename(e.target.value)}
              className="h-11 max-w-md"
              placeholder="Ealho-burnout-guide.pdf"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="max-w-full text-sm"
              onChange={(e) => {
                const picked = e.currentTarget.files?.[0];
                setSelectedFileName(picked?.name ?? "");
                if (picked) {
                  setError(null);
                  setMessage(null);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {selectedFileName ? `Selected: ${selectedFileName}` : "No file selected."}
            </p>
            <Button type="button" disabled={uploading} onClick={() => void uploadPdf()}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                "Upload PDF"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
