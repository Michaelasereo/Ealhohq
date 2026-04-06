"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { endTimeFromStart } from "@/lib/booking/end-time";
import { calculatePackagePrice, getPackageOption } from "@/lib/packages/config";
import { useBookingStore } from "@/stores/bookingStore";

import { AvailabilityCalendar } from "./AvailabilityCalendar";

type TherapistApi = {
  id: string;
  profile: { fullName: string };
  profilePhoto: string | null;
  sessionRate: number;
  sessionRateFormatted: string;
  sessionDuration: number;
  bio: string | null;
  specializations: string[];
  availabilitySchedule: { bookingWindowWeeks: number }[];
};

type Props = {
  confirmHref: string;
  /** When true, attaches logged-in patient id from `/api/patient/me`. */
  usePatient?: boolean;
};

export function BookTherapistClient({ confirmHref, usePatient }: Props) {
  const params = useParams<{ therapistId: string }>();
  const id = params.therapistId;
  const router = useRouter();
  const setDraft = useBookingStore((s) => s.setDraft);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate]);

  const { data: me } = useQuery({
    queryKey: ["patient-me"],
    queryFn: async () => {
      const r = await fetch("/api/patient/me");
      const j = (await r.json()) as {
        success: boolean;
        data?: { patient: { id: string } | null; sessions: { therapist: { id: string } }[] };
      };
      if (!r.ok || !j.success) return null;
      return j.data ?? null;
    },
    enabled: Boolean(usePatient),
  });

  const patientId = me?.patient?.id ?? undefined;

  const sessionCountWithTherapist = useMemo(() => {
    if (!me?.sessions || !id) return 0;
    return me.sessions.filter((s) => s.therapist.id === id).length;
  }, [me?.sessions, id]);

  const {
    data: therapist,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["booking-therapist", id],
    queryFn: async () => {
      const r = await fetch(`/api/booking/therapists/${id}`);
      const j = (await r.json()) as {
        success: boolean;
        data?: TherapistApi;
        error?: string;
      };
      if (!r.ok || !j.success || !j.data) {
        throw new Error(j.error ?? "Failed to load therapist");
      }
      return j.data;
    },
    enabled: Boolean(id),
  });

  const bookingWindowDays = useMemo(() => {
    const w = therapist?.availabilitySchedule?.length
      ? Math.max(
          ...therapist.availabilitySchedule.map((s) => s.bookingWindowWeeks),
        )
      : 4;
    return Math.max(1, w) * 7;
  }, [therapist]);

  const suggestedType =
    usePatient && sessionCountWithTherapist > 0 ? "followup" : "intake";

  function onContinue() {
    if (!therapist || !selectedDate || !selectedSlot) return;
    const endTime = endTimeFromStart(selectedSlot, therapist.sessionDuration);
    setDraft({
      therapistId: therapist.id,
      therapistName: therapist.profile.fullName,
      profilePhoto: therapist.profilePhoto,
      sessionRateFormatted: therapist.sessionRateFormatted,
      sessionRateNaira: Math.round(therapist.sessionRate),
      sessionDuration: therapist.sessionDuration,
      date: selectedDate,
      startTime: selectedSlot,
      endTime,
      sessionType: suggestedType,
      isGuest: !usePatient || !patientId,
      patientId,
      selectedPackage: "single",
      packagePrice: calculatePackagePrice(
        Math.round(therapist.sessionRate),
        getPackageOption("single"),
      ).finalPrice,
    });
    router.push(confirmHref);
  }

  if (isLoading || !therapist) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md space-y-4 p-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md p-4">
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
        <Link
          href={
            confirmHref.includes("dashboard") ? "/dashboard/book" : "/book"
          }
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-4 flex h-12 w-full items-center justify-center",
          )}
        >
          Back
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-4 p-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold">
          Book with {therapist.profile.fullName}
        </h1>
        {therapist.bio ? (
          <p className="mt-2 text-sm text-muted-foreground">{therapist.bio}</p>
        ) : null}
        <p className="mt-2 text-sm">
          <span className="font-semibold text-primary">
            {therapist.sessionRateFormatted}
          </span>
          <span className="text-muted-foreground">
            {" "}
            · {therapist.sessionDuration} min · WAT
          </span>
        </p>
      </div>

      {usePatient && sessionCountWithTherapist > 0 ? (
        <p className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
          Continue with {therapist.profile.fullName} ({sessionCountWithTherapist}{" "}
          session
          {sessionCountWithTherapist === 1 ? "" : "s"}).
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Suggested session type:{" "}
        <span className="font-medium capitalize">
          {suggestedType === "intake" ? "intake" : "follow-up"}
        </span>
      </p>

      <AvailabilityCalendar
        therapistId={therapist.id}
        bookingWindowDays={bookingWindowDays}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        onSelectDate={setSelectedDate}
        onSelectSlot={setSelectedSlot}
      />

      <Button
        type="button"
        className="h-12 w-full bg-primary text-primary-foreground"
        disabled={!selectedDate || !selectedSlot}
        onClick={onContinue}
      >
        Continue
      </Button>
    </main>
  );
}
