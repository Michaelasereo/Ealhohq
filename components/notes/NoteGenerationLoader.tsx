"use client";

import { NOTES_GENERATION_MESSAGES } from "@/lib/loading-messages";

import { LoadingWithCopy } from "@/components/shared/LoadingWithCopy";

export function NoteGenerationLoader() {
  return (
    <div className="flex min-h-[min(100dvh,720px)] w-full flex-col items-center justify-center gap-10 px-4 py-12 text-center">
      <div className="text-primary" aria-hidden>
        <svg
          width="88"
          height="100"
          viewBox="0 0 88 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto"
        >
          <rect
            x="10"
            y="8"
            width="68"
            height="84"
            rx="8"
            stroke="currentColor"
            strokeWidth="2.2"
            fill="none"
            opacity="0.35"
          />
          <path
            d="M22 28h36M22 40h44M22 52h32"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.25"
          />
          <path
            d="M20 68 C 32 62, 48 78, 62 70"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            className="animate-[ealho-note-write_2.4s_ease-in-out_infinite]"
            style={{
              strokeDasharray: 56,
              strokeDashoffset: 0,
            }}
          />
        </svg>
      </div>

      <div className="max-w-md space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Generating your session notes
        </h1>
        <LoadingWithCopy
          messages={[...NOTES_GENERATION_MESSAGES]}
          intervalMs={3500}
          size="lg"
          showSpinner={false}
          showProgressBar
          estimatedSeconds={28}
        />
      </div>

      <div className="max-w-sm space-y-2 text-pretty">
        <p className="text-sm text-muted-foreground">
          This usually takes 20–30 seconds. We are building a complete clinical
          record of your session.
        </p>
        <p className="text-xs text-muted-foreground/80">
          Your notes are encrypted and only visible to you.
        </p>
      </div>
    </div>
  );
}
