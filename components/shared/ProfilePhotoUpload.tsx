"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

type ProfilePhotoUploadProps = {
  currentPhoto?: string | null;
  onUploadComplete?: (url: string) => void;
};

export function ProfilePhotoUpload({
  currentPhoto,
  onUploadComplete,
}: ProfilePhotoUploadProps) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentPhoto ?? null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setPreview(currentPhoto ?? null);
  }, [currentPhoto]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user?.id) setUserId(data.user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(fileExt)
        ? fileExt
        : "jpg";
      const filePath = `${userId}/profile.${safeExt}`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);
      const publicUrl = pub.publicUrl;

      const r = await fetch("/api/therapist/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhoto: publicUrl }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not save photo URL");

      setPreview(publicUrl);
      onUploadComplete?.(publicUrl);
      void qc.invalidateQueries({ queryKey: ["therapist-dashboard"] });
    } catch (err) {
      console.error("Profile photo upload:", err);
      window.alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const isDataUrl = preview?.startsWith("data:") ?? false;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-24 overflow-hidden rounded-full border-2 border-border bg-muted">
        {preview ? (
          <Image
            src={preview}
            alt=""
            fill
            className="object-cover"
            sizes="96px"
            unoptimized={isDataUrl}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-3xl text-muted-foreground">
            —
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div
              className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
          </div>
        ) : null}
      </div>

      <label className="cursor-pointer">
        <span className="text-sm font-medium text-primary hover:underline">
          {uploading ? "Uploading…" : preview ? "Change photo" : "Upload photo"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => void handleFileChange(e)}
          disabled={uploading || !userId}
          className="hidden"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        JPG, PNG or WebP. Max 5MB.
      </p>
    </div>
  );
}
