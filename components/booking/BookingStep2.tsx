"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { BookingData } from "@/components/booking/BookingModal";

type TherapistRow = {
  id: string;
  profile: { fullName: string };
  profilePhoto: string | null;
  specializations: string[];
  sessionRate: number;
  sessionDuration: number;
};

const KEYWORD_MAP: Record<string, string[]> = {
  "Anxiety or worry": ["anxiet", "worry", "stress", "panic", "nervous"],
  "Trauma or PTSD": ["trauma", "ptsd", "abuse", "assault", "flashback"],
  "Depression or low mood": ["depress", "sad", "low mood", "hopeless", "empty"],
  "Relationship issues": ["relationship", "marriage", "partner", "divorce", "couple"],
  "Grief or loss": ["grief", "loss", "death", "bereave", "mourn"],
  "Work or burnout": ["burnout", "work", "career", "overwhelm", "exhausted"],
};

function matchBurnoutStressTherapist(therapists: TherapistRow[]): TherapistRow | null {
  return (
    therapists.find((t) =>
      (t.specializations ?? []).some((s) =>
        ["burnout", "stress", "anxiety", "work"].some((kw) =>
          s.toLowerCase().includes(kw),
        ),
      ),
    ) ?? null
  );
}

function autoMatchTherapist(
  reason: string,
  category: string,
  professionalType: string,
  therapists: TherapistRow[],
): TherapistRow | null {
  if (!therapists.length) return null;

  const pt = (professionalType ?? "").trim();
  const isIntern =
    pt.includes("Intern") ||
    pt.includes("House Officer") ||
    pt.includes("Resident");
  const isSenior =
    pt.includes("Consultant") ||
    pt.includes("Professor") ||
    pt.includes("Matron");
  const isMedStudent = pt.includes("Student");

  if (isIntern || isMedStudent) {
    const match = matchBurnoutStressTherapist(therapists);
    if (match) return match;
  }

  if (isSenior) {
    const match = matchBurnoutStressTherapist(therapists);
    if (match) return match;
  }

  const text = `${reason} ${category}`.toLowerCase();

  for (const [spec, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((kw) => text.includes(kw))) {
      const needle = spec.toLowerCase().split(" ")[0];
      const match = therapists.find((t) =>
        (t.specializations ?? []).some((s) => s.toLowerCase().includes(needle)),
      );
      if (match) return match;
    }
  }

  const cat = category.trim();
  if (cat) {
    const first = cat.toLowerCase().split(/[\s/]+/)[0];
    const byCat = therapists.find((t) =>
      (t.specializations ?? []).some((s) => s.toLowerCase().includes(first)),
    );
    if (byCat) return byCat;
  }

  return therapists[0];
}

type Props = {
  data: BookingData;
  onUpdate: (updates: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function BookingStep2({ data, onUpdate, onNext, onBack }: Props) {
  const [selected, setSelected] = useState(data.therapistId);
  const [autoMatched, setAutoMatched] = useState(false);
  const [matchedTherapist, setMatchedTherapist] = useState<TherapistRow | null>(null);

  const { data: therapists, isLoading } = useQuery({
    queryKey: ["therapists-booking-modal"],
    queryFn: async (): Promise<TherapistRow[]> => {
      const r = await fetch("/api/booking/therapists");
      const j = (await r.json()) as { success?: boolean; data?: TherapistRow[] };
      if (!r.ok || !j.success || !j.data) return [];
      return j.data;
    },
  });

  function applyTherapist(t: TherapistRow, auto: boolean) {
    setSelected(t.id);
    onUpdate({
      therapistId: t.id,
      therapistName: t.profile?.fullName ?? "",
      therapistPhoto: t.profilePhoto ?? null,
      therapistRate: Number(t.sessionRate),
      therapistDuration: t.sessionDuration,
      isAutoMatched: auto,
    });
  }

  function handleAutoMatch() {
    const list = therapists ?? [];
    const match = autoMatchTherapist(
      data.reason,
      data.reasonCategory,
      data.professionalType,
      list,
    );
    if (match) {
      setMatchedTherapist(match);
      setAutoMatched(true);
      applyTherapist(match, true);
    }
  }

  function handleSelectTherapist(t: TherapistRow) {
    setAutoMatched(false);
    setMatchedTherapist(null);
    applyTherapist(t, false);
  }

  function handleNext() {
    if (!selected) return;
    onNext();
  }

  return (
    <div className="space-y-4 p-6">
      {!autoMatched && (
        <button
          type="button"
          onClick={handleAutoMatch}
          disabled={isLoading || !therapists?.length}
          className="group flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 p-4 transition-all hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/15">
            <Sparkles size={18} strokeWidth={1.5} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Auto-match me</p>
            <p className="text-xs text-gray-500">
              We&apos;ll find the best therapist based on what you shared
            </p>
          </div>
        </button>
      )}

      {autoMatched && matchedTherapist && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={14} strokeWidth={1.5} className="text-primary" />
            <p className="text-xs font-semibold text-primary">We found your match</p>
          </div>
          <TherapistCard
            therapist={matchedTherapist}
            selected
            onSelect={() => {}}
          />
          <button
            type="button"
            onClick={() => {
              setAutoMatched(false);
              setMatchedTherapist(null);
              setSelected("");
              onUpdate({
                therapistId: "",
                therapistName: "",
                therapistPhoto: null,
                therapistRate: 0,
                therapistDuration: 50,
                isAutoMatched: false,
              });
            }}
            className="mt-2 text-xs text-gray-400 underline hover:text-gray-600"
          >
            Choose a different therapist instead
          </button>
        </div>
      )}

      {!autoMatched && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">or choose yourself</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(therapists ?? []).map((t) => (
                <TherapistCard
                  key={t.id}
                  therapist={t}
                  selected={selected === t.id}
                  onSelect={() => handleSelectTherapist(t)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!selected}
          className="flex-1 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

function TherapistCard({
  therapist,
  selected,
  onSelect,
}: {
  therapist: TherapistRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-xl border p-3.5 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-gray-100 hover:border-primary/30 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
          {therapist.profilePhoto ? (
            <Image
              src={therapist.profilePhoto}
              alt=""
              width={48}
              height={48}
              className="size-full object-cover grayscale transition-all duration-300 group-hover:grayscale-0"
              sizes="48px"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-primary/10">
              <span className="text-lg font-bold text-primary/40">
                {therapist.profile?.fullName?.[0] ?? "T"}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">
              {therapist.profile?.fullName ?? "Therapist"}
            </p>
            {selected ? (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Selected ✓
              </span>
            ) : null}
          </div>
          <div className="mb-1.5 flex flex-wrap gap-1">
            {(therapist.specializations ?? []).slice(0, 2).map((s) => (
              <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                {s}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={10} strokeWidth={1.5} />
              {therapist.sessionDuration} min
            </span>
            <span className="text-xs font-semibold text-gray-900">
              ₦{Number(therapist.sessionRate).toLocaleString()}
            </span>
          </div>
        </div>

        <ChevronRight
          size={14}
          strokeWidth={1.5}
          className={`shrink-0 transition-colors ${selected ? "text-primary" : "text-gray-300"}`}
        />
      </div>
    </button>
  );
}
