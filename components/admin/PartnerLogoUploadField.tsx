"use client";

import Image from "next/image";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  logoUrl: string | null;
  onLogoUrlChange: (url: string | null) => void;
  disabled?: boolean;
};

export function PartnerLogoUploadField({
  logoUrl,
  onLogoUrlChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setLocalErr("Please choose an image (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalErr("Image must be 5MB or smaller.");
      return;
    }

    setLocalErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await fetch("/api/admin/super-referral-partners/logo-upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { publicUrl?: string };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.publicUrl) {
        throw new Error(j.error ?? "Upload failed");
      }
      onLogoUrlChange(j.data.publicUrl);
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : "Upload failed");
      onLogoUrlChange(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Logo (optional)</Label>
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/40",
            logoUrl && "border-solid border-border",
          )}
        >
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              fill
              className="object-contain p-1"
              sizes="96px"
            />
          ) : (
            <ImageIcon className="size-10 text-muted-foreground/60" strokeWidth={1.25} aria-hidden />
          )}
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {logoUrl ? "Replace logo" : "Upload logo"}
            </Button>
            {logoUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11 shrink-0"
                disabled={disabled || uploading}
                onClick={() => {
                  onLogoUrlChange(null);
                  setLocalErr(null);
                }}
                aria-label="Remove logo"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onFile(e)}
            disabled={disabled || uploading}
          />
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP. Max 5MB. Shown on partner booking links and staff invite emails.
          </p>
          {localErr ? (
            <p className="text-xs text-destructive" role="alert">
              {localErr}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
