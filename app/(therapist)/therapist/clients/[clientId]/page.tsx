"use client";

import { UserX } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { RebookInviteForm } from "@/components/therapist/RebookInviteForm";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingDateStartToIso, formatWAT } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";

type MedicalHistory = {
  currentMedications: string | null;
  allergies: string | null;
  previousDiagnoses: string | null;
  previousTherapy: string | null;
  familyMedical: string | null;
  familyPsychiatric: string | null;
  familySubstanceUse: string | null;
} | null;

type SessionRow = {
  id: string;
  dateIso: string;
  sessionNumber: number;
  type: string;
  durationMins: number;
  status: string;
  notesGenerated: boolean;
  hasNote: boolean;
};

type BookingPending = {
  bookingId: string;
  dateIso: string;
  status: string;
  sessionType: string;
};

type ClientPayload = {
  patient: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    gender: string;
    occupation: string;
  };
  medicalHistory: MedicalHistory;
  sessions: SessionRow[];
  bookingsWithoutSession: BookingPending[];
  sessionCount: number;
  firstSessionDate: string | null;
  lastSessionDate: string | null;
  activePackage: {
    id: string;
    packageType: string;
    totalSessions: number;
    remainingSessions: number;
    expiresAt: string | null;
  } | null;
};

function hasMedicalContent(mh: NonNullable<MedicalHistory>): boolean {
  return Object.values(mh).some((v) => v && String(v).trim().length > 0);
}

type TherapistMe = { id: string };

async function fetchTherapistMe(): Promise<TherapistMe> {
  const r = await fetch("/api/therapist/profile/me", {
    credentials: "include",
  });
  const j = (await r.json()) as {
    success?: boolean;
    data?: TherapistMe;
    error?: string;
  };
  if (!r.ok || !j.success || !j.data?.id) {
    throw new Error(j.error ?? "Failed to load therapist profile");
  }
  return j.data;
}

export default function TherapistClientProfilePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rebookOpen, setRebookOpen] = useState(false);

  const { data: therapistMe } = useQuery({
    queryKey: ["therapist-profile-me"],
    queryFn: fetchTherapistMe,
  });

  const openChatMut = useMutation({
    mutationFn: async (patientId: string) => {
      const r = await fetch("/api/chat/threads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const j = (await r.json()) as {
        success?: boolean;
        data?: { threadId: string };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data?.threadId) {
        throw new Error(j.error ?? "Could not open messages");
      }
      return j.data.threadId;
    },
    onSuccess: (threadId) => {
      void queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      router.push(`/therapist/messages?thread=${threadId}`);
    },
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["therapist-client", clientId],
    queryFn: async () => {
      const r = await fetch(`/api/therapist/clients/${clientId}`, {
        credentials: "include",
      });
      const j = (await r.json()) as {
        success: boolean;
        data?: ClientPayload;
        error?: string;
      };
      if (!r.ok || !j.success || !j.data) {
        throw new Error(j.error ?? "Failed to load client");
      }
      return j.data;
    },
    enabled: Boolean(clientId),
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  if (isError || !data) {
    const notFound =
      error instanceof Error &&
      /not found|404|failed to load/i.test(error.message);
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center p-4 text-center">
        <UserX className="mb-4 size-12 text-gray-300" strokeWidth={1.5} />
        <p className="text-lg font-semibold">Client not found</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {notFound
            ? "This client may have been removed or you may not have access."
            : error instanceof Error
              ? error.message
              : "Something went wrong."}
        </p>
        <Link
          href="/therapist/clients"
          className={cn(
            buttonVariants({ variant: "default" }),
            "mt-6 min-h-12",
          )}
        >
          Back to clients
        </Link>
      </main>
    );
  }

  const { patient, sessions, medicalHistory, bookingsWithoutSession } = data;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl space-y-6 p-4 pb-16">
      <header className="rounded-xl border border-border bg-card p-4">
        <p className="text-lg font-semibold">{patient.fullName}</p>
        <p className="text-sm text-muted-foreground">
          {patient.email} · {patient.phone}
        </p>
        <p className="mt-2 text-sm">
          Total sessions: {data.sessionCount}
          {data.firstSessionDate ? (
            <>
              {" "}
              · First: {data.firstSessionDate}
            </>
          ) : null}
          {data.lastSessionDate ? (
            <>
              {" "}
              · Last: {data.lastSessionDate}
            </>
          ) : null}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-12 w-full border-primary text-primary hover:bg-primary/10 sm:w-auto"
            disabled={openChatMut.isPending}
            onClick={() => openChatMut.mutate(patient.id)}
          >
            Message client
          </Button>
          <Button
            type="button"
            className="min-h-12 w-full sm:w-auto"
            disabled={!therapistMe?.id}
            onClick={() => setRebookOpen(true)}
          >
            Schedule next session
          </Button>
          <Link
            href="/therapist/clients"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "inline-flex min-h-12 items-center justify-center px-0 text-primary sm:justify-start",
            )}
          >
            ← Back to clients
          </Link>
        </div>
        {data.activePackage ? (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm">
            <p className="font-medium">
              Active package: {data.activePackage.totalSessions}-session package
            </p>
            <p className="text-muted-foreground">
              {data.activePackage.remainingSessions} sessions remaining
              {data.activePackage.expiresAt
                ? ` (expires ${new Date(data.activePackage.expiresAt).toLocaleDateString("en-NG", {
                    month: "short",
                    year: "numeric",
                  })})`
                : ""}
            </p>
          </div>
        ) : null}
      </header>

      <Sheet open={rebookOpen} onOpenChange={setRebookOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-xl"
          showCloseButton
        >
          <SheetHeader>
            <SheetTitle>Schedule next session</SheetTitle>
          </SheetHeader>
          {therapistMe?.id ? (
            <div className="px-4 pb-6">
              <RebookInviteForm
                therapistId={therapistMe.id}
                patientId={patient.id}
                patientName={patient.fullName}
                title={`Schedule ${patient.fullName}'s next session`}
                onSent={() => {
                  setRebookOpen(false);
                  void queryClient.invalidateQueries({
                    queryKey: ["therapist-rebook-pending"],
                  });
                }}
              />
            </div>
          ) : (
            <p className="px-4 pb-6 text-sm text-muted-foreground">
              Loading therapist profile…
            </p>
          )}
        </SheetContent>
      </Sheet>

      {medicalHistory && hasMedicalContent(medicalHistory) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medical history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {medicalHistory.currentMedications ? (
              <p>
                <span className="font-medium">Medications: </span>
                {medicalHistory.currentMedications}
              </p>
            ) : null}
            {medicalHistory.allergies ? (
              <p>
                <span className="font-medium">Allergies: </span>
                {medicalHistory.allergies}
              </p>
            ) : null}
            {medicalHistory.previousDiagnoses ? (
              <p>
                <span className="font-medium">Previous diagnoses: </span>
                {medicalHistory.previousDiagnoses}
              </p>
            ) : null}
            {medicalHistory.previousTherapy ? (
              <p>
                <span className="font-medium">Previous therapy: </span>
                {medicalHistory.previousTherapy}
              </p>
            ) : null}
            {medicalHistory.familyMedical ? (
              <p>
                <span className="font-medium">Family medical: </span>
                {medicalHistory.familyMedical}
              </p>
            ) : null}
            {medicalHistory.familyPsychiatric ? (
              <p>
                <span className="font-medium">Family psychiatric: </span>
                {medicalHistory.familyPsychiatric}
              </p>
            ) : null}
            {medicalHistory.familySubstanceUse ? (
              <p>
                <span className="font-medium">Family substance use: </span>
                {medicalHistory.familySubstanceUse}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Session history</h2>
        {sessions.length === 0 && bookingsWithoutSession.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No sessions recorded yet.
            </CardContent>
          </Card>
        ) : null}
        <div className="space-y-3">
          {sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-3 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {formatWAT(s.dateIso)} · Session {s.sessionNumber} ·{" "}
                    {s.type}
                  </p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                    {s.status.replaceAll("-", " ")}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Duration: {s.durationMins} min
                </p>
                {s.notesGenerated && s.hasNote ? (
                  <Link
                    href={`/therapist/sessions/${s.id}/post-session`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "inline-flex min-h-12 items-center justify-center",
                    )}
                  >
                    View note
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {s.status === "completed" && !s.notesGenerated
                      ? "Notes are still generating."
                      : "Note not available yet."}
                  </p>
                )}
                {s.status === "completed" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 w-full border-primary text-primary hover:bg-primary/10"
                    onClick={() => setRebookOpen(true)}
                  >
                    Schedule next
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {bookingsWithoutSession.map((b) => (
            <Card key={b.bookingId}>
              <CardContent className="p-4 text-sm">
                <p className="font-medium">
                  Scheduled · {formatWAT(b.dateIso)} ·{" "}
                  {b.sessionType === "intake" ? "Intake" : "Follow-up"}
                </p>
                <p className="text-muted-foreground capitalize">
                  Booking: {b.status}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
