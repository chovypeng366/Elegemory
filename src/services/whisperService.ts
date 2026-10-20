import {
  WHISPER_SETTING_KEYS,
  parseWhisperSettings,
  whisperEngine,
  type WhisperHistoryEntry,
} from "../lib/whisperEngine";
import { isLateNight } from "../lib/whisperTime";
import type { WhisperFeedback } from "../types";
import { useSettingsStore } from "../stores/settingsStore";
import { api } from "./api";
import { emitWhisper } from "./system";

const WEEK_MS = 7 * 86_400_000;

export async function triggerWhisper(
  feedback: WhisperFeedback | null,
): Promise<void> {
  if (!feedback) return;

  const settings = useSettingsStore.getState().settings;
  const config = parseWhisperSettings(settings);
  if (!config.enabled) return;

  const now = Date.now();
  let history: WhisperHistoryEntry[] = [];
  try {
    history = await api.listWhisperHistory(now - WEEK_MS);
  } catch (error) {
    console.error("读取低语历史失败", error);
  }

  const firstTenth =
    feedback.isTenth &&
    settings[WHISPER_SETTING_KEYS.hellSeen] !== "1";
  const count =
    feedback.kind === "todo"
      ? feedback.todoCreatedCount
      : feedback.noteCreatedCount;

  const selection = whisperEngine.pick({
    kind: feedback.kind,
    count,
    mood: feedback.dailyMood,
    workdayKey: feedback.workdayKey,
    now,
    history,
    settings: config,
    firstTenth,
    lateNight: isLateNight(new Date(now)),
  });
  if (!selection) return;

  try {
    await api.recordWhisper({
      phraseId: selection.phrase.id,
      category: selection.phrase.category,
      noteType: feedback.kind,
      shownAt: now,
      workdayKey: feedback.workdayKey,
    });
    if (firstTenth) {
      await useSettingsStore
        .getState()
        .updateSetting(WHISPER_SETTING_KEYS.hellSeen, "1");
    }
  } catch (error) {
    console.error("保存低语历史失败", error);
  }

  try {
    await emitWhisper({
      phrase: selection.phrase,
      shownAt: now,
      noteType: feedback.kind,
    });
  } catch (error) {
    console.error("显示低语失败", error);
  }
}
