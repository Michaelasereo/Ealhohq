"use client";

import { ClipboardList } from "lucide-react";

type Props = {
  html: string | null;
};

export function BurnoutEmbed({ html }: Props) {
  const trimmed = html?.trim() ?? "";
  const hasEmbed = trimmed.length > 0 && trimmed !== "<!-- Brevo embed code will go here -->";

  if (hasEmbed) {
    return (
      <div
        className="min-h-[200px] w-full [&_iframe]:min-h-[420px] [&_iframe]:w-full"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }

  return (
    <div
      id="brevo-form-placeholder"
      className="rounded-2xl border-2 border-dashed border-[#2C3B2D]/20 p-12 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2C3B2D]/10">
        <ClipboardList size={20} strokeWidth={1.5} className="text-[#2C3B2D]" />
      </div>
      <p className="mb-1 text-sm font-semibold text-gray-700">Assessment Form</p>
      <p className="text-xs text-gray-400">
        Brevo embed code will appear here. Admin can update this in Settings → Site Content.
      </p>
    </div>
  );
}
