import { useEffect, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Toasts } from "./components/Toasts";
import { BoardWindow } from "./features/board/BoardWindow";
import { CaptureWindow } from "./features/capture/CaptureWindow";
import { isTauri } from "./services/env";

function resolveWindowLabel(): string {
  if (isTauri()) return getCurrentWindow().label;
  return new URLSearchParams(window.location.search).get("window") === "capture"
    ? "capture"
    : "main";
}

export default function App() {
  const label = useMemo(resolveWindowLabel, []);

  useEffect(() => {
    document.documentElement.dataset.window = label;
    document.title = label === "capture" ? "Elegemory 速记" : "Elegemory";
  }, [label]);

  return (
    <div className="h-full">
      {label === "capture" ? <CaptureWindow /> : <BoardWindow />}
      <Toasts />
    </div>
  );
}
