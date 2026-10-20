import { describe, expect, it } from "vitest";
import {
  WHISPER_LIBRARY,
  type WhisperCategory,
} from "./whisperLibrary";
import {
  DEFAULT_WHISPER_SETTINGS,
  WhisperEngine,
  chooseCategory,
  type WhisperHistoryEntry,
  type WhisperPickContext,
  type WhisperSettings,
} from "./whisperEngine";

const AUTUMN_NOW = new Date(2026, 9, 21, 12, 0).getTime();

function seededRandom(seed = 42): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function context(
  overrides: Partial<WhisperPickContext> = {},
): WhisperPickContext {
  return {
    kind: "note",
    count: 1,
    mood: "Warm",
    workdayKey: "2026-10-21",
    now: AUTUMN_NOW,
    history: [],
    settings: { ...DEFAULT_WHISPER_SETTINGS, seasonal: false },
    firstTenth: false,
    lateNight: false,
    ...overrides,
  };
}

describe("whisper trigger categories", () => {
  const settings = { ...DEFAULT_WHISPER_SETTINGS };
  const random = () => 0.5;

  it("maps note and todo counts to encouragement, care, tenth and companion", () => {
    expect(chooseCategory("note", 1, false, false, settings, null, random)).toBe(
      "note_encouragement",
    );
    expect(chooseCategory("note", 5, false, false, settings, null, random)).toBe(
      "note_encouragement",
    );
    expect(chooseCategory("note", 6, false, false, settings, null, random)).toBe(
      "note_care",
    );
    expect(chooseCategory("todo", 9, false, false, settings, null, random)).toBe(
      "todo_care",
    );
    expect(chooseCategory("note", 10, true, false, settings, null, random)).toBe(
      "after_ten",
    );
    expect(chooseCategory("todo", 11, false, false, settings, null, random)).toBe(
      "companion",
    );
    expect(chooseCategory("todo", 1, false, false, settings, null, random)).toBe(
      "todo_encouragement",
    );
  });

  it("gives late night priority over normal categories but not the tenth", () => {
    expect(chooseCategory("note", 3, false, true, settings, null, random)).toBe(
      "late_night",
    );
    expect(chooseCategory("note", 10, true, true, settings, null, random)).toBe(
      "after_ten",
    );
  });

  it("only uses seasonal occasionally when enabled", () => {
    expect(
      chooseCategory("note", 3, false, false, settings, "autumn", () => 0.05),
    ).toBe("seasonal");
    expect(
      chooseCategory(
        "note",
        3,
        false,
        false,
        { ...settings, seasonal: false },
        "autumn",
        () => 0.05,
      ),
    ).toBe("note_encouragement");
  });
});

describe("whisper engine", () => {
  it("shows the fixed tenth phrase first and when configured always", () => {
    const engine = new WhisperEngine(WHISPER_LIBRARY, seededRandom());
    const first = engine.pick(
      context({
        count: 10,
        firstTenth: true,
        lateNight: true,
        mood: "Playful",
      }),
    );
    expect(first?.phrase.text).toBe("这里是地狱吗");

    const always = new WhisperEngine(WHISPER_LIBRARY, seededRandom());
    const setting: WhisperSettings = {
      ...DEFAULT_WHISPER_SETTINGS,
      tenthMode: "always_original",
    };
    const again = always.pick(
      context({ count: 10, settings: setting, firstTenth: false }),
    );
    expect(again?.phrase.text).toBe("这里是地狱吗");
  });

  it("uses the easter egg pool after the first tenth", () => {
    const engine = new WhisperEngine(WHISPER_LIBRARY, seededRandom());
    const selection = engine.pick(
      context({
        count: 10,
        firstTenth: false,
        settings: { ...DEFAULT_WHISPER_SETTINGS, tenthMode: "random_after_first" },
      }),
    );
    expect(selection).not.toBeNull();
    expect(selection?.phrase.id).not.toBe("special-hell");
    expect(["after_ten", "easter_eggs"]).toContain(selection?.phrase.category);
  });

  it("chooses late night phrases only when late night is active", () => {
    const engine = new WhisperEngine(WHISPER_LIBRARY, seededRandom());
    const late = engine.pick(
      context({ count: 3, lateNight: true, settings: { ...DEFAULT_WHISPER_SETTINGS } }),
    );
    expect(late?.phrase.category).toBe("late_night");

    const noLate = new WhisperEngine(WHISPER_LIBRARY, seededRandom());
    const normal = noLate.pick(
      context({
        count: 3,
        lateNight: true,
        settings: { ...DEFAULT_WHISPER_SETTINGS, lateNight: false },
      }),
    );
    expect(normal?.phrase.category).toBe("note_encouragement");
  });

  it("does not repeat a phrase in the same workday", () => {
    const engine = new WhisperEngine(WHISPER_LIBRARY, seededRandom());
    const history: WhisperHistoryEntry[] = [];
    const picked: string[] = [];

    for (let index = 0; index < 30; index += 1) {
      const selection = engine.pick(
        context({ now: AUTUMN_NOW + index * 1000, history }),
      );
      expect(selection).not.toBeNull();
      picked.push(selection!.phrase.id);
      history.push({
        phraseId: selection!.phrase.id,
        category: selection!.phrase.category,
        noteType: "note",
        shownAt: AUTUMN_NOW + index * 1000,
        workdayKey: "2026-10-21",
      });
    }

    expect(new Set(picked).size).toBe(picked.length);
  });

  it("avoids phrases shown in the last seven days when alternatives exist", () => {
    const notePhrases = WHISPER_LIBRARY.filter(
      (phrase) => phrase.category === "note_encouragement",
    );
    const allowed = new Set(notePhrases.slice(0, 3).map((phrase) => phrase.id));
    const history: WhisperHistoryEntry[] = notePhrases.slice(3).map((phrase) => ({
      phraseId: phrase.id,
      category: phrase.category,
      noteType: "note",
      shownAt: AUTUMN_NOW - 2 * 86_400_000,
      workdayKey: "2026-10-19",
    }));

    const engine = new WhisperEngine(WHISPER_LIBRARY, seededRandom());
    const selection = engine.pick(context({ history }));
    expect(selection).not.toBeNull();
    expect(allowed.has(selection!.phrase.id)).toBe(true);
  });

  it("keeps going when a category pool is exhausted", () => {
    const engine = new WhisperEngine(WHISPER_LIBRARY, seededRandom());
    const history: WhisperHistoryEntry[] = [];
    for (let index = 0; index < 55; index += 1) {
      const selection = engine.pick(
        context({ now: AUTUMN_NOW + index * 1000, history }),
      );
      expect(selection).not.toBeNull();
      history.push({
        phraseId: selection!.phrase.id,
        category: selection!.phrase.category,
        noteType: "note",
        shownAt: AUTUMN_NOW + index * 1000,
        workdayKey: "2026-10-21",
      });
    }
  });

  it("weights playful daily moods toward playful phrasing", () => {
    const countPlayful = (mood: string) => {
      const engine = new WhisperEngine(WHISPER_LIBRARY, seededRandom(7));
      const history: WhisperHistoryEntry[] = [];
      let matches = 0;
      for (let index = 0; index < 30; index += 1) {
        const selection = engine.pick(
          context({
            mood,
            history,
            now: AUTUMN_NOW + index * 1000,
          }),
        );
        if (selection?.phrase.tone === "playful") matches += 1;
        history.push({
          phraseId: selection!.phrase.id,
          category: selection!.phrase.category as WhisperCategory,
          noteType: "note",
          shownAt: AUTUMN_NOW + index * 1000,
          workdayKey: "2026-10-21",
        });
      }
      return matches;
    };

    expect(countPlayful("Playful")).toBeGreaterThan(countPlayful("Calm"));
  });
});
