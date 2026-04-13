import { describe, expect, it } from "vitest";

import {
  endTimeForSlot,
  slotsForPsychiatristDay,
} from "./slots-for-date";

describe("slotsForPsychiatristDay", () => {
  it("returns slots for an active Monday schedule", () => {
    const schedules = [
      {
        dayOfWeek: 0,
        startTime: "09:00",
        endTime: "10:30",
        sessionDurationMinutes: 60,
        bufferMinutes: 0,
        isActive: true,
      },
    ];
    // 2026-04-13 is Monday (WAT weekday 0 in project convention)
    const slots = slotsForPsychiatristDay("2026-04-13", schedules);
    expect(slots).toEqual(["09:00"]);
  });

  it("returns empty when day inactive", () => {
    expect(
      slotsForPsychiatristDay("2026-04-13", [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          sessionDurationMinutes: 60,
          bufferMinutes: 0,
          isActive: true,
        },
      ]),
    ).toEqual([]);
  });
});

describe("endTimeForSlot", () => {
  it("adds duration across hour boundary", () => {
    expect(endTimeForSlot("09:00", 90)).toBe("10:30");
  });
});
