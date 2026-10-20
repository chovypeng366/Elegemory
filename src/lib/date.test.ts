import { describe, expect, it } from "vitest";
import {
  formatDateKeyLabel,
  localDateKey,
  matchesDateFilter,
} from "./utils";

describe("date filtering helpers", () => {
  it("formats local date keys without timezone drift", () => {
    expect(localDateKey(new Date(2026, 9, 20, 23, 59).getTime())).toBe(
      "2026-10-20",
    );
    expect(localDateKey(new Date(2026, 9, 21, 0, 1).getTime())).toBe(
      "2026-10-21",
    );
  });

  it("formats a date key for display", () => {
    expect(formatDateKeyLabel("2026-10-20")).toBe("2026年10月20日");
    expect(formatDateKeyLabel("2026-01-03")).toBe("2026年1月3日");
    expect(formatDateKeyLabel("nonsense")).toBe("nonsense");
  });

  it("matches timestamps to the selected local date", () => {
    const timestamp = new Date(2026, 9, 20, 18, 30).getTime();
    expect(matchesDateFilter(timestamp, "")).toBe(true);
    expect(matchesDateFilter(timestamp, "2026-10-20")).toBe(true);
    expect(matchesDateFilter(timestamp, "2026-10-19")).toBe(false);
  });
});
