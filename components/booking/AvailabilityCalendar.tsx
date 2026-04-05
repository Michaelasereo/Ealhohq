"use client";

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { addWatDays, getCalendarCells, watTodayDateString } from "@/lib/wat-datetime";

import { SlotPicker } from "./SlotPicker";

type Props = {
  therapistId: string;
  bookingWindowDays: number;
  selectedDate: string | null;
  selectedSlot: string | null;
  onSelectDate: (ymd: string) => void;
  onSelectSlot: (slot: string) => void;
};

async function fetchSlots(therapistId: string, ymd: string): Promise<string[]> {
  const r = await fetch(
    `/api/booking/slots?therapistId=${encodeURIComponent(therapistId)}&date=${encodeURIComponent(ymd)}`,
  );
  const j = (await r.json()) as { success: boolean; data?: string[] };
  if (!j.success || !j.data) return [];
  return j.data;
}

export function AvailabilityCalendar({
  therapistId,
  bookingWindowDays,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
}: Props) {
  const today = watTodayDateString();
  const maxDay = addWatDays(today, bookingWindowDays);

  const [viewYear, setViewYear] = useState(() => {
    const [y] = today.split("-").map(Number);
    return y;
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const [, m] = today.split("-").map(Number);
    return m;
  });

  const cells = useMemo(
    () => getCalendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const bookableDays = useMemo(() => {
    const set = new Set<string>();
    for (const c of cells) {
      if (!c.inMonth) continue;
      if (c.ymd < today || c.ymd > maxDay) continue;
      set.add(c.ymd);
    }
    return [...set];
  }, [cells, today, maxDay]);

  const slotQueries = useQueries({
    queries: bookableDays.map((ymd) => ({
      queryKey: ["booking-slots", therapistId, ymd] as const,
      queryFn: () => fetchSlots(therapistId, ymd),
      staleTime: 30_000,
    })),
  });

  const slotsByDay = useMemo(() => {
    const m = new Map<string, string[]>();
    bookableDays.forEach((ymd, i) => {
      m.set(ymd, slotQueries[i]?.data ?? []);
    });
    return m;
  }, [bookableDays, slotQueries]);

  const loadingSlots = slotQueries.some((q) => q.isLoading);
  const slotError = slotQueries.some((q) => q.isError);

  const monthLabel = new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(
    new Date(
      `${viewYear}-${String(viewMonth).padStart(2, "0")}-15T12:00:00+01:00`,
    ),
  );

  function prevMonth() {
    if (viewMonth <= 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth >= 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const selectedSlots =
    selectedDate && slotsByDay.has(selectedDate)
      ? (slotsByDay.get(selectedDate) ?? [])
      : [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-lg border text-lg"
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="text-center text-sm font-semibold">{monthLabel}</p>
          <button
            type="button"
            onClick={nextMonth}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-lg border text-lg"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {loadingSlots ? (
          <div className="space-y-2">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : slotError ? (
          <p className="text-center text-sm text-destructive">
            Could not load availability. Try again.
          </p>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c) => {
                if (!c.inMonth) {
                  return <div key={`${c.ymd}-pad`} className="aspect-square" />;
                }
                const past = c.ymd < today;
                const tooFar = c.ymd > maxDay;
                const slots = slotsByDay.get(c.ymd) ?? [];
                const hasSlots = slots.length > 0;
                const selectable = !past && !tooFar && hasSlots;
                const dim = past || tooFar || !hasSlots;

                return (
                  <button
                    key={c.ymd}
                    type="button"
                    disabled={!selectable}
                    onClick={() => onSelectDate(c.ymd)}
                    className={`flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      selectedDate === c.ymd
                        ? "bg-primary text-primary-foreground"
                        : selectable
                          ? "bg-primary/10 text-primary"
                          : dim
                            ? "cursor-not-allowed bg-muted/50 text-muted-foreground"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {Number(c.ymd.slice(8, 10))}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedDate ? (
        <SlotPicker
          slots={selectedSlots}
          selected={selectedSlot}
          onSlotSelect={(s) => {
            onSelectSlot(s);
          }}
        />
      ) : null}
    </div>
  );
}
