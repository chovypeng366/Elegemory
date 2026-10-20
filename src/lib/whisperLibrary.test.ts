import { describe, expect, it } from "vitest";
import {
  HELL_PHRASE,
  WHISPER_CATEGORY_COUNTS,
  WHISPER_LIBRARY,
  type WhisperCategory,
  type WhisperSeason,
} from "./whisperLibrary";

const REQUIRED_COUNTS: Record<WhisperCategory, number> = {
  note_encouragement: 50,
  todo_encouragement: 40,
  note_care: 30,
  todo_care: 30,
  after_ten: 25,
  late_night: 40,
  seasonal: 20,
  easter_eggs: 15,
  companion: 20,
};

const SEASONS: WhisperSeason[] = ["spring", "summer", "autumn", "winter"];

function contentLength(text: string): number {
  return text.replace(/[，。！？、：；…—\s「」“”"'()（）]/g, "").length;
}

describe("whisper library", () => {
  it("has at least 250 curated phrases with required category coverage", () => {
    expect(WHISPER_LIBRARY.length).toBeGreaterThanOrEqual(250);
    for (const [category, required] of Object.entries(REQUIRED_COUNTS)) {
      expect(WHISPER_CATEGORY_COUNTS[category as WhisperCategory]).toBeGreaterThanOrEqual(
        required,
      );
    }
  });

  it("uses unique ids and unique texts", () => {
    const ids = new Set(WHISPER_LIBRARY.map((phrase) => phrase.id));
    const texts = new Set(WHISPER_LIBRARY.map((phrase) => phrase.text));
    expect(ids.size).toBe(WHISPER_LIBRARY.length);
    expect(texts.size).toBe(WHISPER_LIBRARY.length);
  });

  it("keeps the special tenth phrase", () => {
    expect(HELL_PHRASE.text).toBe("这里是地狱吗");
    expect(WHISPER_LIBRARY.some((phrase) => phrase.id === HELL_PHRASE.id)).toBe(
      true,
    );
  });

  it("keeps most phrases short and readable", () => {
    const lengths = WHISPER_LIBRARY.map((phrase) => contentLength(phrase.text));
    const inRange = lengths.filter((length) => length >= 6 && length <= 18).length;
    expect(inRange / lengths.length).toBeGreaterThanOrEqual(0.9);
  });

  it("tags seasonal phrases with a valid season", () => {
    for (const phrase of WHISPER_LIBRARY) {
      if (phrase.category === "seasonal") {
        expect(phrase.season).toBeTruthy();
      }
      if (phrase.season) {
        expect(SEASONS).toContain(phrase.season);
      }
    }
  });

  it("covers every tone", () => {
    const tones = new Set(WHISPER_LIBRARY.map((phrase) => phrase.tone));
    expect([...tones].sort()).toEqual(
      ["calm", "cozy", "gentle", "playful", "poetic", "reflective"].sort(),
    );
  });
});
