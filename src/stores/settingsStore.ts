import { create } from "zustand";
import { errorMessage } from "../lib/utils";
import { api, CAPTURE_SHORTCUT_KEY } from "../services/api";
import type { AppInfo } from "../types";
import { useUiStore } from "./uiStore";

export const DEFAULT_SHORTCUT = "Ctrl+Shift+Space";

interface SettingsState {
  settings: Record<string, string>;
  appInfo: AppInfo | null;
  loading: boolean;
  loaded: boolean;
  load: (force?: boolean) => Promise<void>;
  refreshAppInfo: () => Promise<void>;
  updateShortcut: (shortcut: string) => Promise<boolean>;
  updateSetting: (key: string, value: string) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {},
  appInfo: null,
  loading: false,
  loaded: false,

  async load(force = false) {
    if (get().loaded && !force) return;
    set({ loading: true });
    try {
      const [settings, appInfo] = await Promise.all([
        api.getSettings(),
        api.getAppInfo(),
      ]);
      set({ settings, appInfo, loaded: true, loading: false });
    } catch (error) {
      set({ loading: false });
      useUiStore.getState().pushToast(errorMessage(error), "error");
    }
  },

  async refreshAppInfo() {
    try {
      const appInfo = await api.getAppInfo();
      set({ appInfo });
    } catch {
      // settings panel already reports its own errors
    }
  },

  async updateShortcut(shortcut) {
    try {
      const normalized = await api.setCaptureShortcut(shortcut);
      set((state) => ({
        settings: { ...state.settings, [CAPTURE_SHORTCUT_KEY]: normalized },
      }));
      useUiStore.getState().pushToast(`速记快捷键已更新为 ${normalized}`, "success");
      return true;
    } catch (error) {
      useUiStore.getState().pushToast(errorMessage(error), "error");
      return false;
    }
  },

  async updateSetting(key, value) {
    const previous = get().settings[key];
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));

    try {
      await api.setSetting(key, value);
      return true;
    } catch (error) {
      set((state) => {
        const nextSettings = { ...state.settings };
        if (previous === undefined) delete nextSettings[key];
        else nextSettings[key] = previous;
        return { settings: nextSettings };
      });
      useUiStore.getState().pushToast(errorMessage(error), "error");
      return false;
    }
  },
}));

export function captureShortcutLabel(settings: Record<string, string>): string {
  return settings[CAPTURE_SHORTCUT_KEY] || DEFAULT_SHORTCUT;
}
