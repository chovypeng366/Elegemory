import { useEffect, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Toasts } from "./components/Toasts";
import { BoardWindow } from "./features/board/BoardWindow";
import { CaptureWindow } from "./features/capture/CaptureWindow";
import { PinnedNoteWindow } from "./features/pin/PinnedNoteWindow";
import { applyAppearance } from "./lib/appearance";
import { isTauri } from "./services/env";
import { useSettingsStore } from "./stores/settingsStore";

function resolveWindowLabel(): string {
  if (isTauri()) return getCurrentWindow().label;
  const requested = new URLSearchParams(window.location.search).get("window");
  if (requested === "capture" || requested === "pin") return requested;
  return "main";
}

export default function App() {
  const label = useMemo(resolveWindowLabel, []);
  const settings = useSettingsStore((state) => state.settings);
  const loadSettings = useSettingsStore((state) => state.load);

  useEffect(() => {
    document.documentElement.dataset.window = label;
    document.title = label === "capture" ? "Elegemory 速记" : "Elegemory";
  }, [label]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    applyAppearance(settings);
  }, [settings]);

  return (
    <div className="h-full">
      {label === "capture" ? (
        <CaptureWindow />
      ) : label === "pin" ? (
        <PinnedNoteWindow />
      ) : (
        <BoardWindow />
      )}
      {label !== "pin" && <Toasts />}
    </div>
  );
}
