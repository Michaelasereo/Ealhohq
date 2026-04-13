"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, Check } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useState } from "react";

import { PsychiatricReferralForm } from "@/components/psychiatry/PsychiatricReferralForm";
import { NoteGenerationLoader } from "@/components/notes/NoteGenerationLoader";
import { SoapNoteDisplay, type NoteType } from "@/components/notes/SoapNoteDisplay";
import { SoapNoteEditor } from "@/components/notes/SoapNoteEditor";
import { AnonymousBadge } from "@/components/therapist/AnonymousBadge";
import { RebookInviteForm } from "@/components/therapist/RebookInviteForm";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { emptySoapProgressNote } from "@/lib/notes/empty-soap-template";
import { cn } from "@/lib/utils";

type NoteApiData =
  | { ready: false; sessionId: string }
  | {
      ready: true;
      sessionId: string;
      noteType: string;
      noteContent: Record<string, unknown> | null;
      generatedAt: string | null;
      isEdited: boolean;
    };

type SessionCtx = {
  therapistId: string;
  patient: { id: string; fullName: string };
  booking: {
    id: string;
    isAnonymous: boolean;
    clientId: string;
    professionalType: string | null;
  };
  psychiatricReferral?: {
    id: string;
    clinicalReason: string;
    status: string;
  } | null;
};

async function fetchSessionCtx(sessionId: string): Promise<SessionCtx> {
  const res = await fetch(`/api/therapist/sessions/${sessionId}`, {
    credentials: "include",
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: SessionCtx;
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? "Failed to load session");
  }
  return json.data;
}

async function fetchNote(sessionId: string): Promise<NoteApiData> {
  const res = await fetch(`/api/therapist/sessions/${sessionId}/note`, {
    credentials: "include",
  });
  const json = (await res.json()) as {
    success?: boolean;
    data?: NoteApiData;
    error?: string;
  };
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error ?? "Failed to load note");
  }
  return json.data;
}

function PostSessionInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const manual = searchParams.get("manual") === "true";
  const qc = useQueryClient();
  const [timedOut, setTimedOut] = useState(false);
  const [editing, setEditing] = useState(manual);
  const [notesReadySplash, setNotesReadySplash] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  const { data: sessionCtx } = useQuery({
    queryKey: ["therapist-session-ctx", sessionId],
    queryFn: () => fetchSessionCtx(sessionId),
    enabled: Boolean(sessionId),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["therapist-session-note", sessionId],
    queryFn: () => fetchNote(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => {
      if (manual) return false;
      return q.state.data && "ready" in q.state.data && q.state.data.ready
        ? false
        : 5000;
    },
    staleTime: 0,
  });

  const ready = Boolean(data && "ready" in data && data.ready);
  const waitPhase =
    data === undefined ? "loading" : ready ? "ready" : "pending";

  const noteContent =
    data && "ready" in data && data.ready && data.noteContent &&
    typeof data.noteContent === "object"
      ? data.noteContent
      : null;

  useEffect(() => {
    setTimedOut(false);
  }, [sessionId]);

  useLayoutEffect(() => {
    if (!ready || manual || !noteContent) {
      setNotesReadySplash(false);
      return;
    }
    setNotesReadySplash(true);
  }, [ready, manual, noteContent, sessionId]);

  useEffect(() => {
    if (!notesReadySplash) return;
    const t = window.setTimeout(() => setNotesReadySplash(false), 1000);
    return () => window.clearTimeout(t);
  }, [notesReadySplash]);

  useEffect(() => {
    if (manual || waitPhase !== "pending") {
      if (waitPhase === "ready") setTimedOut(false);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), 180_000);
    return () => clearTimeout(t);
  }, [sessionId, waitPhase, manual]);

  if (!sessionId) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl p-4">
        <p className="text-sm text-muted-foreground">Invalid session.</p>
      </main>
    );
  }

  if (!manual && isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl p-4">
        <NoteGenerationLoader />
      </main>
    );
  }

  if (manual && isLoading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl space-y-4 p-4">
        <h1 className="text-xl font-semibold">Session notes</h1>
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/2 animate-pulse" />
          <Skeleton className="h-24 w-full animate-pulse" />
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl space-y-4 p-4">
        <h1 className="text-xl font-semibold">Notes</h1>
        <p className="text-sm text-destructive">
          {(error as Error)?.message ?? "Something went wrong."}
        </p>
        <Link
          href="/therapist/sessions"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex min-h-12 items-center justify-center",
          )}
        >
          Back to sessions
        </Link>
      </main>
    );
  }

  if (!data) return null;

  const stillGenerating = !data.ready && !manual;
  const noteType = (data.ready ? data.noteType : "soap") as NoteType;

  if (manual && !data.ready) {
    const empty = emptySoapProgressNote();
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 p-4 pb-16">
        <div>
          <h1 className="text-xl font-semibold">Manual session notes</h1>
          <p className="text-sm text-muted-foreground">
            Enter your SOAP note below. Nothing is sent for AI generation.
          </p>
        </div>
        <SoapNoteEditor
          note={empty}
          noteType="soap"
          sessionId={sessionId}
          useManualPersist
          onSave={() => {
            void qc.invalidateQueries({
              queryKey: ["therapist-session-note", sessionId],
            });
            setEditing(false);
          }}
          onCancel={() => {
            window.history.back();
          }}
        />
      </main>
    );
  }

  if (stillGenerating && timedOut) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl space-y-4 p-4">
        <h1 className="text-xl font-semibold">Notes delayed</h1>
        <p className="text-sm text-muted-foreground">
          Note generation is taking longer than usual.
        </p>
        <p className="text-sm text-muted-foreground">
          We will notify you when your notes are ready.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/therapist/sessions/${sessionId}/post-session?manual=true`}
            className={cn(
              buttonVariants({ variant: "default" }),
              "inline-flex min-h-12 items-center justify-center",
            )}
          >
            Enter notes manually
          </Link>
          <Link
            href="/therapist/sessions"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex min-h-12 items-center justify-center",
            )}
          >
            Back to sessions
          </Link>
          <Button
            type="button"
            variant="outline"
            className="min-h-12"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </main>
    );
  }

  if (stillGenerating) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl p-4">
        <NoteGenerationLoader />
        <div className="flex justify-center pb-8">
          <Link
            href={`/therapist/sessions/${sessionId}/post-session?manual=true`}
            className={cn(
              buttonVariants({ variant: "link" }),
              "min-h-12",
            )}
          >
            Enter notes manually instead
          </Link>
        </div>
      </main>
    );
  }

  if (ready && notesReadySplash && noteContent) {
    return (
      <main className="mx-auto flex min-h-[min(100dvh,640px)] w-full max-w-2xl flex-col items-center justify-center gap-6 p-4 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary"
          aria-hidden
        >
          <Check className="size-10" strokeWidth={2.5} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-2xl font-semibold text-foreground"
        >
          Your notes are ready
        </motion.h1>
      </main>
    );
  }

  if (!noteContent) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl space-y-4 p-4">
        <h1 className="text-xl font-semibold">Notes</h1>
        <p className="text-sm text-muted-foreground">
          Note content could not be loaded.
        </p>
        <Link
          href="/therapist/sessions"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex min-h-12 items-center justify-center",
          )}
        >
          Back to sessions
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 p-4 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Session notes</h1>
            {sessionCtx?.booking.isAnonymous ? <AnonymousBadge /> : null}
            {sessionCtx?.booking.professionalType ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {sessionCtx.booking.professionalType}
              </span>
            ) : null}
          </div>
          {sessionCtx?.booking.isAnonymous ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {sessionCtx.booking.clientId}
            </p>
          ) : null}
          {data.ready && data.generatedAt ? (
            <p className="text-xs text-muted-foreground">
              Generated {new Date(data.generatedAt).toLocaleString("en-NG")}
              {data.isEdited ? " · Edited" : ""}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {!editing ? (
            <>
              <Button
                type="button"
                variant="secondary"
                className="min-h-12"
                onClick={() => setEditing(true)}
              >
                Edit note
              </Button>
              <Button type="button" variant="outline" className="min-h-12" disabled>
                Export PDF (soon)
              </Button>
            </>
          ) : null}
          <Link
            href="/therapist/sessions"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "inline-flex min-h-12 items-center justify-center",
            )}
          >
            Back to sessions
          </Link>
        </div>
      </div>

      {editing ? (
        <SoapNoteEditor
          note={noteContent}
          noteType={noteType}
          sessionId={sessionId}
          onSave={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <SoapNoteDisplay note={noteContent} noteType={noteType} />
      )}

      {sessionCtx?.patient.id ? (
        <section className="rounded-xl border border-border bg-card p-4">
          <RebookInviteForm
            therapistId={sessionCtx.therapistId}
            patientId={sessionCtx.patient.id}
            patientName={sessionCtx.patient.fullName}
            title={`Schedule ${sessionCtx.patient.fullName.split(" ")[0] ?? "client"}'s next session`}
          />
        </section>
      ) : null}

      {sessionCtx?.patient.id ? (
        <section className="mt-6 border-t border-border pt-6">
          <button
            type="button"
            onClick={() => setShowReferral((v) => !v)}
            className="flex min-h-12 w-full items-center gap-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Brain className="size-4 shrink-0" strokeWidth={1.5} />
            {showReferral
              ? "Hide psychiatric referral"
              : "Recommend psychiatric assessment"}
          </button>
          {showReferral ? (
            <PsychiatricReferralForm
              therapySessionId={sessionId}
              existingReferral={sessionCtx.psychiatricReferral}
            />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

export default function PostSessionPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl p-4">
          <Skeleton className="h-8 w-48" />
        </main>
      }
    >
      <PostSessionInner />
    </Suspense>
  );
}
