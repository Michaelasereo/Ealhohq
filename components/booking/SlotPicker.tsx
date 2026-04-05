"use client";

import { cn } from "@/lib/utils";

type Props = {
  slots: string[];
  selected: string | null;
  onSlotSelect: (slot: string) => void;
};

export function SlotPicker({ slots, selected, onSlotSelect }: Props) {
  if (slots.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        No times available for this day.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Available times (WAT)</p>
      <div className="flex flex-col gap-2">
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onSlotSelect(slot)}
            className={cn(
              "flex min-h-12 w-full items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors",
              selected === slot
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            {slot}
          </button>
        ))}
      </div>
    </div>
  );
}
