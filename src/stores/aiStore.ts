import { create } from "zustand";
import { errorMessage } from "../lib/utils";
import {
  deepSeekProvider,
  type AiStatus,
  type AiTestResult,
} from "../services/ai/provider";
import { useUiStore } from "./uiStore";

interface AiState {
  status: AiStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
  saveKey: (key: string) => Promise<boolean>;
  clearKey: () => Promise<boolean>;
  test: () => Promise<AiTestResult | null>;
}

export const useAiStore = create<AiState>((set) => ({
  status: null,
  loading: false,

  async refresh() {
    set({ loading: true });
    try {
      const status = await deepSeekProvider.status();
      set({ status, loading: false });
    } catch (error) {
      set({ loading: false });
      useUiStore.getState().pushToast(errorMessage(error), "error");
    }
  },

  async saveKey(key) {
    try {
      const status = await deepSeekProvider.saveKey(key);
      set({ status });
      return true;
    } catch (error) {
      useUiStore.getState().pushToast(errorMessage(error), "error");
      return false;
    }
  },

  async clearKey() {
    try {
      const status = await deepSeekProvider.clearKey();
      set({ status });
      return true;
    } catch (error) {
      useUiStore.getState().pushToast(errorMessage(error), "error");
      return false;
    }
  },

  async test() {
    try {
      return await deepSeekProvider.test();
    } catch (error) {
      useUiStore.getState().pushToast(errorMessage(error), "error");
      return null;
    }
  },
}));
