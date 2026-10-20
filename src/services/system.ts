import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { WhisperEventPayload } from "../types";
import { isTauri } from "./env";

export type Unlisten = () => void;

const LOCAL_EVENT = "elegemory:notes-changed";
const WHISPER_CHANNEL = "elegemory-whisper";

export async function hideCurrentWindow(): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().hide();
}

export async function minimizeCurrentWindow(): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().minimize();
}

export async function toggleMaximizeCurrentWindow(): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().toggleMaximize();
}

export async function resizeCaptureWindow(hasImage: boolean): Promise<void> {
  if (!isTauri()) return;
  await getCurrentWindow().setSize(new LogicalSize(460, hasImage ? 560 : 340));
}

export async function showCapture(): Promise<void> {
  if (!isTauri()) return;
  await invoke("show_capture");
}

export async function hideCapture(): Promise<void> {
  if (!isTauri()) return;
  await invoke("hide_capture");
}

export async function showBoard(): Promise<void> {
  if (!isTauri()) return;
  await invoke("show_board");
}

export async function quitApp(): Promise<void> {
  if (!isTauri()) return;
  await invoke("quit_app");
}

export async function emitNotesChanged(): Promise<void> {
  if (isTauri()) {
    await emit("notes-changed");
    return;
  }
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

export async function onNotesChanged(handler: () => void): Promise<Unlisten> {
  if (isTauri()) {
    return listen("notes-changed", () => handler());
  }
  const listener = () => handler();
  window.addEventListener(LOCAL_EVENT, listener);
  return () => window.removeEventListener(LOCAL_EVENT, listener);
}

export async function onWindowFocus(handler: () => void): Promise<Unlisten> {
  if (!isTauri()) return () => undefined;
  return getCurrentWindow().onFocusChanged((event) => {
    if (event.payload) handler();
  });
}

export async function emitWhisper(payload: WhisperEventPayload): Promise<void> {
  if (isTauri()) {
    await emit("whisper", payload);
    return;
  }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(WHISPER_CHANNEL);
    channel.postMessage(payload);
    channel.close();
    return;
  }
  window.dispatchEvent(new CustomEvent(WHISPER_CHANNEL, { detail: payload }));
}

export async function onWhisper(
  handler: (payload: WhisperEventPayload) => void,
): Promise<Unlisten> {
  if (isTauri()) {
    return listen<WhisperEventPayload>("whisper", (event) => {
      handler(event.payload);
    });
  }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(WHISPER_CHANNEL);
    channel.onmessage = (event) => handler(event.data as WhisperEventPayload);
    return () => channel.close();
  }
  const localHandler = (event: Event) => {
    handler((event as CustomEvent<WhisperEventPayload>).detail);
  };
  window.addEventListener(WHISPER_CHANNEL, localHandler);
  return () => window.removeEventListener(WHISPER_CHANNEL, localHandler);
}

export async function onCaptureShown(handler: () => void): Promise<Unlisten> {
  if (!isTauri()) return () => undefined;
  return listen("capture-shown", () => handler());
}

export async function onImageDrop(
  handler: (paths: string[]) => void,
): Promise<Unlisten> {
  if (!isTauri()) return () => undefined;
  return getCurrentWindow().onDragDropEvent((event) => {
    if (event.payload.type === "drop") {
      handler(event.payload.paths);
    }
  });
}
