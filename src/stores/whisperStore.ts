import { create } from "zustand";
import type { WhisperPhrase } from "../lib/whisperLibrary";

interface CurrentWhisper {
  key: string;
  phrase: WhisperPhrase;
}

interface WhisperBarState {
  current: CurrentWhisper | null;
  show: (phrase: WhisperPhrase) => void;
  clear: () => void;
}

const VISIBLE_MS = 3000;
let timer: number | undefined;
let waitingForVisible = false;

function startHideTimer() {
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = undefined;
    useWhisperStore.setState({ current: null });
  }, VISIBLE_MS);
}

export const useWhisperStore = create<WhisperBarState>((set) => ({
  current: null,

  show: (phrase) => {
    if (timer) window.clearTimeout(timer);
    timer = undefined;
    set({ current: { key: `${phrase.id}-${Date.now()}`, phrase } });

    if (typeof document !== "undefined" && document.hidden) {
      waitingForVisible = true;
      return;
    }
    waitingForVisible = false;
    startHideTimer();
  },

  clear: () => {
    if (timer) window.clearTimeout(timer);
    timer = undefined;
    waitingForVisible = false;
    set({ current: null });
  },
}));

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || !waitingForVisible) return;
    waitingForVisible = false;
    startHideTimer();
  });
}
