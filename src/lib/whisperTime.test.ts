import { describe, expect, it } from "vitest";
import { isLateNight, previousWorkdayKeyFor, workdayKeyFor } from "./whisperTime";

function localDate(hour: number, minute = 0): Date {
  return new Date(2026, 9, 21, hour, minute, 0);
}

describe("workday time helpers", () => {
  it("switches the workday at 05:00 local time", () => {
    expect(workdayKeyFor(localDate(4, 59))).toBe("2026-10-20");
    expect(workdayKeyFor(localDate(5, 0))).toBe("2026-10-21");
    expect(workdayKeyFor(localDate(23, 59))).toBe("2026-10-21");
  });

  it("computes the previous workday relative to the 05:00 boundary", () => {
    expect(previousWorkdayKeyFor(localDate(5, 0))).toBe("2026-10-20");
    expect(previousWorkdayKeyFor(localDate(3, 0))).toBe("2026-10-19");
  });

  it("treats 01:00 through 04:59 as late night", () => {
    expect(isLateNight(localDate(0, 59))).toBe(false);
    expect(isLateNight(localDate(1, 0))).toBe(true);
    expect(isLateNight(localDate(4, 59))).toBe(true);
    expect(isLateNight(localDate(5, 0))).toBe(false);
  });
});
