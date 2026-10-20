import { describe, expect, it } from "vitest";
import type { Note } from "../types";
import {
  formatDateKeyLabel,
  groupByDate,
  localDateKey,
  matchesDateFilter,
} from "./utils";

function noteAt(id: string, createdAt: number): Note {
  return {
    id,
    type: "text",
    title: id,
    createdAt,
    updatedAt: createdAt,
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    blocks: [],
  };
}

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

  it("groups every local natural day separately, newest first", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const older = new Date(today);
    older.setDate(older.getDate() - 3);

    const groups = groupByDate([
      noteAt("today-late", today.getTime() + 60_000),
      noteAt("today-early", today.getTime()),
      noteAt("yesterday", yesterday.getTime()),
      noteAt("older", older.getTime()),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      `今天 · ${formatDateKeyLabel(localDateKey(today.getTime()))}`,
      `昨天 · ${formatDateKeyLabel(localDateKey(yesterday.getTime()))}`,
      formatDateKeyLabel(localDateKey(older.getTime())),
    ]);
    expect(groups.map((group) => group.notes.length)).toEqual([2, 1, 1]);
  });
});
