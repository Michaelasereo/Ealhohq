import { getAvailableSlots } from "@/lib/availability/slots";
import { addWatDays } from "@/lib/wat-datetime";

export type NextSlotPick = { date: string; time: string };

/**
 * Walks forward from `startYmd` (inclusive) and returns the first `maxSlots`
 * available start times for a therapist.
 */
export async function collectNextAvailableSlots(
  therapistId: string,
  maxSlots: number,
  startYmd: string,
  maxDaysScan = 42,
): Promise<NextSlotPick[]> {
  const out: NextSlotPick[] = [];
  for (let i = 0; i < maxDaysScan && out.length < maxSlots; i++) {
    const ymd = addWatDays(startYmd, i);
    const slots = await getAvailableSlots(therapistId, ymd);
    for (const t of slots) {
      if (out.length >= maxSlots) break;
      out.push({ date: ymd, time: t });
    }
  }
  return out;
}
