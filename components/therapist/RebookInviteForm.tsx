"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { addWatDays, watTodayDateString } from "@/lib/wat-datetime";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  therapistId: string;
  patientId: string;
  patientName: string;
  title?: string;
  onSent?: () => void;
};

type DaySlots = { ymd: string; slots: string[] };

async function fetchSlotsForDay(
  therapistId: string,
  ymd: string,
): Promise<DaySlots> {
  const r = await fetch(
    `/api/booking/slots?therapistId=${encodeURIComponent(therapistId)}&date=${encodeURIComponent(ymd)}`,
  );
  const j = (await r.json()) as {
    success?: boolean;
    data?: string[];
  };
  const slots = r.ok && j.success && Array.isArray(j.data) ? j.data : [];
  return { ymd, slots };
}

function formatDayLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00+01:00`);
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(d);
}

function formatSlot(ymd: string, t: string): string {
  const iso = `${ymd}T${t}:00+01:00`;
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export function RebookInviteForm({
  therapistId,
  patientId,
  patientName,
  title = "Schedule next session",
  onSent,
}: Props) {
  const [selectedYmd, setSelectedYmd] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sessionType, setSessionType] = useState<"intake" | "followup">(
    "followup",
  );
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const dayList = useMemo(() => {
    const today = watTodayDateString();
    const start = addWatDays(today, 1);
    return Array.from({ length: 14 }, (_, i) => addWatDays(start, i));
  }, []);

  const { data: daysData, isLoading } = useQuery({
    queryKey: ["rebook-slot-days", therapistId, dayList.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        dayList.map((ymd) => fetchSlotsForDay(therapistId, ymd)),
      );
      return results.filter((d) => d.slots.length > 0);
    },
    enabled: Boolean(therapistId),
  });

  const activeDay = daysData?.find((d) => d.ymd === selectedYmd) ?? null;

  const sendMut = useMutation({
    onMutate: () => ({ toastId: toast.loading("Sending session invitation...") }),
    mutationFn: async () => {
      if (!selectedYmd || !selectedTime) {
        throw new Error("Pick a date and time");
      }
      const r = await fetch("/api/therapist/rebook", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          suggestedDate: selectedYmd,
          suggestedTime: selectedTime,
          sessionType,
          message: message.trim() || undefined,
        }),
      });
      const j = (await r.json()) as { success?: boolean; error?: string };
      if (!r.ok || !j.success) {
        throw new Error(j.error ?? "Failed to send invitation");
      }
    },
    onSuccess: (_d, _v, ctx) => {
      if (ctx?.toastId) toast.dismiss(ctx.toastId);
      toast.success("Invitation sent! ✅");
      setDoneMsg(
        `Invitation sent to ${patientName}. They have 7 days to confirm and pay. You will be notified when they respond.`,
      );
      onSent?.();
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.toastId) toast.dismiss(ctx.toastId);
      toast.error("Failed to send. Try again.");
    },
  });

  if (doneMsg) {
    return (
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-foreground">
        {doneMsg}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {patientName}&apos;s next session — pick a slot in the next two weeks
          (WAT).
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !daysData?.length ? (
        <p className="text-sm text-muted-foreground">
          No open slots in the next two weeks. Update your availability first.
        </p>
      ) : (
        <>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">
              Date
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {daysData.map((d) => (
                <button
                  key={d.ymd}
                  type="button"
                  onClick={() => {
                    setSelectedYmd(d.ymd);
                    setSelectedTime(null);
                  }}
                  className={cn(
                    "min-h-10 rounded-lg border px-3 py-2 text-sm",
                    selectedYmd === d.ymd
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border",
                  )}
                >
                  {formatDayLabel(d.ymd)}
                </button>
              ))}
            </div>
          </div>

          {activeDay ? (
            <div>
              <Label className="text-xs uppercase text-muted-foreground">
                Time
              </Label>
              <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {activeDay.slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={cn(
                      "min-h-10 rounded-lg border px-3 py-2 text-sm",
                      selectedTime === t
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border",
                    )}
                  >
                    {formatSlot(activeDay.ymd, t)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <Label htmlFor="rb-type">Session type</Label>
            <select
              id="rb-type"
              className="mt-1 flex min-h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base"
              value={sessionType}
              onChange={(e) =>
                setSessionType(e.target.value as "intake" | "followup")
              }
            >
              <option value="followup">Follow-up</option>
              <option value="intake">Intake</option>
            </select>
          </div>

          <div>
            <Label htmlFor="rb-msg">Message to client (optional)</Label>
            <textarea
              id="rb-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Great session today. Looking forward to continuing next week."
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>

          {sendMut.isError ? (
            <p className="text-sm text-destructive">
              {sendMut.error instanceof Error
                ? sendMut.error.message
                : "Error"}
            </p>
          ) : null}

          <Button
            type="button"
            className="min-h-12 w-full"
            disabled={!selectedYmd || !selectedTime || sendMut.isPending}
            onClick={() => sendMut.mutate()}
          >
            {sendMut.isPending ? "Sending…" : "Send session invitation"}
          </Button>
        </>
      )}
    </div>
  );
}
