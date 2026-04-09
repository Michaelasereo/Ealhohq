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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [lastUploadedFileName, setLastUploadedFileName] = useState<string>("");
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [uploadedPreviewVersion, setUploadedPreviewVersion] = useState<number>(Date.now());

  const [heroText, setHeroText] = useState("Get a free burnout guide");
  const [burnoutLandingText, setBurnoutLandingText] = useState("");
  const [modalTitle, setModalTitle] = useState(DEFAULT_MODAL_TITLE);
  const [modalSubtitle, setModalSubtitle] = useState(DEFAULT_MODAL_SUBTITLE);
  const [modalSuccess, setModalSuccess] = useState(DEFAULT_MODAL_SUCCESS);
  const [emailFilename, setEmailFilename] = useState("Ealho-burnout-guide.pdf");

  const [freebieStatus, setFreebieStatus] = useState<{
    configured: boolean;
    bucket: string;
    storagePath: string | null;
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
          data?: {
            configured?: boolean;
            emailFilename?: string;
            bucket?: string;
            storagePath?: string | null;
          };
        };
        if (adminJson.data) {
          setFreebieStatus({
            configured: Boolean(adminJson.data.configured),
            bucket: adminJson.data.bucket ?? "freebies",
            storagePath: adminJson.data.storagePath ?? null,
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

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

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
    setUploadProgress(0);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const effectiveFilename = (emailFilename.trim() || file.name || "Ealho-burnout-guide.pdf")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .slice(0, 120);
      fd.append("emailFilename", effectiveFilename);
      const res = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/burnout-freebie");
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          setUploadProgress(percent);
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.ontimeout = () => reject(new Error("Upload timed out"));
        xhr.onload = () => {
          const text = xhr.responseText ?? "";
          resolve(
            new Response(text, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: { "Content-Type": xhr.getResponseHeader("content-type") ?? "text/plain" },
            }),
          );
        };

        xhr.send(fd);
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
      setUploadProgress(100);
      input.value = "";
      setSelectedFileName("");
      setLastUploadedFileName(file.name);
      setEmailFilename(effectiveFilename);
      setMessage("PDF uploaded and saved successfully.");
      setUploadedPreviewVersion(Date.now());
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
          {freebieStatus?.storagePath ? (
            <p className="text-xs text-muted-foreground">
              Current storage path:{" "}
              <code className="rounded bg-muted px-1 text-xs">{freebieStatus.storagePath}</code>
            </p>
          ) : null}
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
                  const nextPreviewUrl = URL.createObjectURL(picked);
                  setSelectedPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return nextPreviewUrl;
                  });
                  if (
                    !emailFilename.trim() ||
                    emailFilename.trim() === "Ealho-burnout-guide.pdf"
                  ) {
                    setEmailFilename(picked.name);
                  }
                  setError(null);
                  setMessage(null);
                } else {
                  setSelectedPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                  });
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {selectedFileName
                ? `Selected: ${selectedFileName}`
                : lastUploadedFileName
                  ? `No file selected. Last uploaded: ${lastUploadedFileName}`
                  : "No file selected."}
            </p>
            <Button
              type="button"
              disabled={uploading || !selectedFileName}
              onClick={() => void uploadPdf()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving PDF changes… {uploadProgress}%
                </>
              ) : (
                "Save PDF changes"
              )}
            </Button>
          </div>
          {uploading ? (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width] duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Uploading and saving in admin… {uploadProgress}%
              </p>
            </div>
          ) : null}
          {selectedPreviewUrl ? (
            <div className="space-y-2">
              <Label>Selected PDF preview (before save)</Label>
              <iframe
                key={selectedPreviewUrl}
                src={selectedPreviewUrl}
                className="h-96 w-full rounded-md border bg-white"
                title="Selected PDF preview"
              />
            </div>
          ) : null}
          {freebieStatus?.configured ? (
            <div className="space-y-2">
              <Label>Current uploaded PDF preview</Label>
              <iframe
                key={uploadedPreviewVersion}
                src={`/api/burnout-guide/download?inline=1&t=${uploadedPreviewVersion}`}
                className="h-96 w-full rounded-md border bg-white"
                title="Uploaded PDF preview"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
