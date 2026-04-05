"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Star } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const moods = ["😞", "😐", "🙂", "😊", "😄"] as const;

type FeedbackMeta = {
  submitted: boolean;
  needsProfile?: boolean;
  therapistName: string;
  therapistPhoto: string;
};

async function fetchFeedbackMeta(sessionId: string): Promise<FeedbackMeta> {
  const r = await fetch(`/api/patient/feedback/${sessionId}`, {
    credentials: "include",
  });
  const j = (await r.json()) as {
    success?: boolean;
    data?: FeedbackMeta;
    error?: string;
  };
  if (r.status === 404) {
    throw new Error("Session not found");
  }
  if (!r.ok) throw new Error(j.error ?? "Failed to load");
  return j.data!;
}

export default function FeedbackPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [mood, setMood] = useState<string>("");
  const [comment, setComment] = useState("");
  const [thankYou, setThankYou] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["patient-feedback-meta", sessionId],
    queryFn: () => fetchFeedbackMeta(sessionId),
    enabled: Boolean(sessionId),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/patient/feedback/${sessionId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          mood: mood || null,
          comment: comment.trim() || null,
        }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) {
        throw new Error(j.error ?? "Failed to submit");
      }
    },
    onSuccess: () => {
      setThankYou(true);
      void queryClient.invalidateQueries({
        queryKey: ["patient-feedback-meta", sessionId],
      });
    },
  });

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[375px] p-4 pb-24 md:pb-8">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="mt-4 h-12 w-full rounded-xl" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto w-full max-w-[375px] p-4 pb-24 md:pb-8">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-primary underline"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  if (data?.needsProfile) {
    return (
      <main className="mx-auto w-full max-w-[375px] space-y-4 p-4 pb-24 md:pb-8">
        <p className="text-sm text-muted-foreground">
          Complete your patient profile before leaving session feedback.
        </p>
        <Link
          href="/profile"
          className={cn(buttonVariants({ variant: "default" }), "min-h-12 w-full")}
        >
          Go to profile
        </Link>
      </main>
    );
  }

  if (data?.submitted && !thankYou) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-[375px] flex-col items-center justify-center px-4 pb-24 text-center md:pb-8">
        <p className="text-lg font-semibold text-foreground">
          Feedback already submitted. Thank you!
        </p>
        <Link
          href="/dashboard"
          className="mt-6 text-sm font-medium text-primary underline"
        >
          Back to dashboard
        </Link>
      </main>
    );
  }

  if (thankYou) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-[375px] flex-col items-center justify-center px-4 pb-24 text-center md:pb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="mb-6 flex size-20 items-center justify-center rounded-full bg-primary/15"
          aria-hidden
        >
          <Check className="size-10 text-primary" strokeWidth={1.5} />
        </motion.div>
        <h1 className="text-xl font-semibold">Thank you for your feedback!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your therapist appreciates it. See you next time.
        </p>
        <Link
          href="/book"
          className={cn(
            buttonVariants({ variant: "default" }),
            "mt-8 min-h-12 w-full max-w-sm",
          )}
        >
          Book your next session
        </Link>
      </main>
    );
  }

  const photo = data?.therapistPhoto ?? "/Ealho-logo.png";
  const name = data?.therapistName ?? "your therapist";

  return (
    <main className="mx-auto min-h-screen w-full max-w-[375px] px-4 py-4 pb-28 md:pb-8">
      <h1 className="text-xl font-semibold leading-snug">
        How was your session with {name}?
      </h1>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-3">
        <Image
          src={photo}
          alt=""
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-full object-cover"
          unoptimized={photo.startsWith("http")}
        />
        <p className="font-medium">{name}</p>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-sm font-medium">Rate your session</p>
        <div className="flex justify-between gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="flex min-h-12 min-w-12 items-center justify-center rounded-lg"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "size-10 transition-colors",
                  n <= rating
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/40",
                )}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-sm font-medium">How are you feeling?</p>
        <div className="flex flex-wrap justify-between gap-2">
          {moods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={cn(
                "flex min-h-12 min-w-12 items-center justify-center rounded-full border-2 border-transparent text-3xl transition-shadow",
                mood === m && "ring-2 ring-primary ring-offset-2",
              )}
              aria-pressed={mood === m}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <label htmlFor="fb-comment" className="mb-2 block text-sm font-medium">
          Tell us more{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="fb-comment"
          value={comment}
          maxLength={500}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us more (optional)"
          rows={4}
          className={cn(
            "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base",
            "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {comment.length}/500
        </p>
      </div>

      <Button
        type="button"
        variant="default"
        className="mt-6 min-h-12 w-full"
        disabled={rating === 0 || submitMut.isPending}
        onClick={() => submitMut.mutate()}
      >
        {submitMut.isPending ? "Submitting…" : "Submit Feedback"}
      </Button>

      {submitMut.isError ? (
        <p className="mt-2 text-center text-sm text-destructive">
          {submitMut.error instanceof Error
            ? submitMut.error.message
            : "Could not submit"}
        </p>
      ) : null}

      <div className="mt-4 text-center">
        <Link
          href="/sessions"
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          Skip for now
        </Link>
      </div>
    </main>
  );
}
