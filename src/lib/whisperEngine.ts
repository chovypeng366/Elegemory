import {
  HELL_PHRASE,
  WHISPER_LIBRARY,
  type WhisperCategory,
  type WhisperPhrase,
  type WhisperSeason,
  type WhisperTone,
  phrasesByCategories,
  seasonForMonth,
} from "./whisperLibrary";

export type WhisperTonePreference = "gentle" | "playful" | "mixed";
export type TenthMode = "random_after_first" | "always_original";

export interface WhisperSettings {
  enabled: boolean;
  tone: WhisperTonePreference;
  lateNight: boolean;
  seasonal: boolean;
  tenthMode: TenthMode;
  enhancedMotion: boolean;
}

export const WHISPER_SETTING_KEYS = {
  enabled: "whisper_enabled",
  tone: "whisper_tone",
  lateNight: "whisper_late_night",
  seasonal: "whisper_seasonal",
  tenthMode: "whisper_tenth_mode",
  enhancedMotion: "whisper_enhanced_motion",
  hellSeen: "whisper_hell_seen",
} as const;

export const DEFAULT_WHISPER_SETTINGS: WhisperSettings = {
  enabled: true,
  tone: "mixed",
  lateNight: true,
  seasonal: true,
  tenthMode: "random_after_first",
  enhancedMotion: true,
};

export function parseWhisperSettings(
  settings: Record<string, string>,
): WhisperSettings {
  const tone = settings[WHISPER_SETTING_KEYS.tone];
  return {
    enabled: settings[WHISPER_SETTING_KEYS.enabled] !== "0",
    tone:
      tone === "gentle" || tone === "playful" || tone === "mixed"
        ? tone
        : DEFAULT_WHISPER_SETTINGS.tone,
    lateNight: settings[WHISPER_SETTING_KEYS.lateNight] !== "0",
    seasonal: settings[WHISPER_SETTING_KEYS.seasonal] !== "0",
    tenthMode:
      settings[WHISPER_SETTING_KEYS.tenthMode] === "always_original"
        ? "always_original"
        : "random_after_first",
    enhancedMotion: settings[WHISPER_SETTING_KEYS.enhancedMotion] !== "0",
  };
}

export interface WhisperHistoryEntry {
  id?: string;
  phraseId: string;
  category: string;
  noteType: "note" | "todo";
  shownAt: number;
  workdayKey: string;
}

export interface WhisperPickContext {
  kind: "note" | "todo";
  count: number;
  mood: string;
  workdayKey: string;
  now: number;
  history: WhisperHistoryEntry[];
  settings: WhisperSettings;
  firstTenth?: boolean;
  lateNight?: boolean;
}

export interface WhisperSelection {
  phrase: WhisperPhrase;
  category: WhisperCategory;
}

export function baseCategory(
  kind: "note" | "todo",
  count: number,
): WhisperCategory {
  if (count <= 5) {
    return kind === "note" ? "note_encouragement" : "todo_encouragement";
  }
  if (count <= 9) {
    return kind === "note" ? "note_care" : "todo_care";
  }
  return "companion";
}

export function chooseCategory(
  kind: "note" | "todo",
  count: number,
  isTenth: boolean,
  lateNight: boolean,
  settings: WhisperSettings,
  season: WhisperSeason | null,
  random: () => number,
): WhisperCategory {
  if (isTenth) return "after_ten";
  if (lateNight) return "late_night";
  if (settings.seasonal && season && random() < 0.14) return "seasonal";
  return baseCategory(kind, count);
}

export class WhisperEngine {
  private readonly byId: Map<string, WhisperPhrase>;
  private readonly bags = new Map<string, string[]>();
  private readonly random: () => number;

  constructor(
    phrases: WhisperPhrase[] = WHISPER_LIBRARY,
    random: () => number = Math.random,
  ) {
    this.byId = new Map(phrases.map((phrase) => [phrase.id, phrase]));
    this.random = random;
  }

  reset(): void {
    this.bags.clear();
  }

  pick(context: WhisperPickContext): WhisperSelection | null {
    const isTenth = context.count === 10;
    const isLate =
      Boolean(context.lateNight) && context.settings.lateNight && !isTenth;
    const season = context.settings.seasonal
      ? seasonForMonth(new Date(context.now).getMonth() + 1)
      : null;

    if (isTenth) {
      if (context.firstTenth || context.settings.tenthMode === "always_original") {
        return { phrase: HELL_PHRASE, category: "after_ten" };
      }
    }

    const category = chooseCategory(
      context.kind,
      context.count,
      isTenth,
      isLate,
      context.settings,
      season,
      this.random,
    );
    const categories: WhisperCategory[] =
      isTenth && !context.firstTenth
        ? ["after_ten", "easter_eggs"]
        : [category];

    let pool = phrasesByCategories(categories).filter(
      (phrase) => phrase.id !== HELL_PHRASE.id,
    );
    if (category === "seasonal" && season) {
      pool = pool.filter((phrase) => phrase.season === season);
    }
    if (!pool.length) return null;

    const todayIds = new Set(
      context.history
        .filter((entry) => entry.workdayKey === context.workdayKey)
        .map((entry) => entry.phraseId),
    );
    const weekIds = new Set(
      context.history
        .filter((entry) => entry.shownAt >= context.now - 7 * 86_400_000)
        .map((entry) => entry.phraseId),
    );
    const lastEntry = context.history.reduce<WhisperHistoryEntry | null>(
      (latest, entry) =>
        !latest || entry.shownAt > latest.shownAt ? entry : latest,
      null,
    );
    const lastPhrase = lastEntry ? this.byId.get(lastEntry.phraseId) : undefined;
    const lastTone = lastPhrase?.tone;

    let eligible = pool.filter(
      (phrase) => !todayIds.has(phrase.id) && !weekIds.has(phrase.id),
    );
    if (!eligible.length) {
      eligible = pool.filter((phrase) => !todayIds.has(phrase.id));
    }
    if (!eligible.length) {
      eligible = pool.filter((phrase) => phrase.id !== lastPhrase?.id);
    }
    if (!eligible.length) eligible = pool;

    const bagKey = `${categories.join("+")}:${season ?? "all"}`;
    const eligibleIds = new Set(eligible.map((phrase) => phrase.id));
    let bag = (this.bags.get(bagKey) ?? []).filter((id) =>
      eligibleIds.has(id),
    );

    if (!bag.length) {
      bag = this.weightedShuffle(eligible, context, season, lastTone).map(
        (phrase) => phrase.id,
      );
    }

    let phraseId = bag.shift() ?? eligible[0]?.id;
    if (phraseId && phraseId === lastPhrase?.id && bag.length) {
      const alternative = bag.shift();
      if (alternative) {
        bag.unshift(phraseId);
        phraseId = alternative;
      }
    }
    this.bags.set(bagKey, bag);

    const phrase = phraseId ? this.byId.get(phraseId) : undefined;
    if (!phrase) return null;
    return { phrase, category: phrase.category };
  }

  private weightFor(
    phrase: WhisperPhrase,
    context: WhisperPickContext,
    season: WhisperSeason | null,
    lastTone?: WhisperTone,
  ): number {
    let weight = 1;
    const mood = context.mood.toLowerCase();
    if (phrase.tone === mood) weight *= 2.8;
    if (lastTone && phrase.tone === lastTone) weight *= 0.4;
    if (context.settings.tone === "gentle") {
      if (
        phrase.tone === "gentle" ||
        phrase.tone === "calm" ||
        phrase.tone === "cozy"
      ) {
        weight *= 1.6;
      }
      if (phrase.tone === "playful") weight *= 0.5;
    } else if (context.settings.tone === "playful") {
      if (phrase.tone === "playful") weight *= 2.2;
      if (phrase.tone === "reflective" || phrase.tone === "poetic") {
        weight *= 0.75;
      }
    }
    if (season && phrase.season === season) weight *= 1.3;
    return weight;
  }

  private weightedShuffle(
    pool: WhisperPhrase[],
    context: WhisperPickContext,
    season: WhisperSeason | null,
    lastTone?: WhisperTone,
  ): WhisperPhrase[] {
    return pool
      .map((phrase) => {
        const weight = this.weightFor(phrase, context, season, lastTone);
        return { phrase, key: Math.pow(this.random(), 1 / weight) };
      })
      .sort((a, b) => b.key - a.key)
      .map((entry) => entry.phrase);
  }
}

export const whisperEngine = new WhisperEngine();
