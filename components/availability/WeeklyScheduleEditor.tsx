"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DEFAULT_DAY = {
  active: false,
  startTime: "09:00",
  endTime: "17:00",
  sessionDuration: 50,
  bufferMinutes: 10,
};

type DayRow = typeof DEFAULT_DAY;

type AvailabilityResponse = {
  success?: boolean;
  data?: {
    schedule: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      sessionDurationMinutes: number;
      bufferMinutes: number;
      isActive: boolean;
    }[];
    overrides: unknown[];
  };
  error?: string;
};

type SchedulePayload = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sessionDurationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
}[];

export function WeeklyScheduleEditor() {
  const queryClient = useQueryClient();
  const [initialized, setInitialized] = useState(false);
  const [saved, setSaved] = useState(false);
  const [schedule, setSchedule] = useState<Record<number, DayRow>>(() =>
    Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((d) => [d, { ...DEFAULT_DAY }]),
    ) as Record<number, DayRow>,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["therapist-availability"],
    queryFn: async () => {
      const r = await fetch("/api/therapist/availability", {
        credentials: "include",
      });
      const j = (await r.json()) as AvailabilityResponse;
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      return j;
    },
  });

  useEffect(() => {
    if (!data?.success || !data.data || initialized) return;
    const populated: Record<number, DayRow> = Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((d) => [d, { ...DEFAULT_DAY }]),
    ) as Record<number, DayRow>;
    for (const s of data.data.schedule) {
      populated[s.dayOfWeek] = {
        active: s.isActive !== false,
        startTime: s.startTime,
        endTime: s.endTime,
        sessionDuration: s.sessionDurationMinutes,
        bufferMinutes: s.bufferMinutes,
      };
    }
    setSchedule(populated);
    setInitialized(true);
  }, [data, initialized]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SchedulePayload) => {
      const r = await fetch("/api/therapist/availability", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: payload }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      return j;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["therapist-availability"] });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    },
  });

  function buildPayload(): SchedulePayload {
    return Object.entries(schedule)
      .filter(([, v]) => v.active)
      .map(([day, v]) => ({
        dayOfWeek: Number(day),
        startTime: v.startTime,
        endTime: v.endTime,
        sessionDurationMinutes: v.sessionDuration,
        bufferMinutes: v.bufferMinutes,
        isActive: true,
      }));
  }

  function updateDay(day: number, field: keyof DayRow, value: DayRow[keyof DayRow]) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function handleSave() {
    saveMutation.mutate(buildPayload());
  }

  if (isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">Weekly schedule</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Recurring availability. All times are WAT (West Africa Time).
      </p>

      <div className="space-y-3">
        {DAYS.map((dayName, dayIndex) => {
          const day = schedule[dayIndex];
          return (
            <div
              key={dayIndex}
              className={`rounded-xl border p-4 transition-colors ${
                day.active
                  ? "border-primary/25 bg-primary/5"
                  : "border-border bg-muted/40"
              }`}
            >
              <div className="mb-3 flex items-center gap-3">
                <button
                  type="button"
                  aria-pressed={day.active}
                  onClick={() => updateDay(dayIndex, "active", !day.active)}
                  className={`relative h-6 w-10 rounded-full transition-colors ${
                    day.active ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-background shadow transition-transform ${
                      day.active ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-medium ${
                    day.active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {dayName}
                </span>
                {!day.active ? (
                  <span className="ml-auto text-xs text-muted-foreground">
                    Unavailable
                  </span>
                ) : null}
              </div>

              {day.active ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Start time
                    </label>
                    <input
                      type="time"
                      value={day.startTime}
                      onChange={(e) =>
                        updateDay(dayIndex, "startTime", e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      End time
                    </label>
                    <input
                      type="time"
                      value={day.endTime}
                      onChange={(e) =>
                        updateDay(dayIndex, "endTime", e.target.value)
                      }
                      className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Session
                    </label>
                    <select
                      value={day.sessionDuration}
                      onChange={(e) =>
                        updateDay(
                          dayIndex,
                          "sessionDuration",
                          Number(e.target.value),
                        )
                      }
                      className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
                    >
                      <option value={50}>50 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Buffer
                    </label>
                    <select
                      value={day.bufferMinutes}
                      onChange={(e) =>
                        updateDay(
                          dayIndex,
                          "bufferMinutes",
                          Number(e.target.value),
                        )
                      }
                      className="w-full rounded-lg border border-input bg-background px-2 py-2 text-sm"
                    >
                      <option value={0}>No buffer</option>
                      <option value={10}>10 min</option>
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                    </select>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="mt-6 h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {saveMutation.isPending ? "Saving…" : "Save schedule"}
      </Button>

      {saved ? (
        <p className="mt-3 text-center text-sm text-emerald-600 dark:text-emerald-400">
          Schedule saved successfully.
        </p>
      ) : null}
      {saveMutation.isError ? (
        <p className="mt-3 text-center text-sm text-destructive">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : "Could not save"}
        </p>
      ) : null}
    </div>
  );
}
