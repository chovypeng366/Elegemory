import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "../services/env";

export function handleWindowDrag(event: React.MouseEvent): void {
  if (!isTauri() || event.button !== 0) return;
  const target = event.target as HTMLElement;
  if (target.closest("button, input, textarea, select, a, [data-no-drag]")) return;
  void getCurrentWindow().startDragging();
}
