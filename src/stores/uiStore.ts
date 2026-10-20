import { create } from "zustand";
import type { BoardFilter } from "../types";

export type ToastTone = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "normal";
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

interface UiState {
  filter: BoardFilter;
  query: string;
  selectedNoteId: string | null;
  settingsOpen: boolean;
  toasts: Toast[];
  pendingConfirm: PendingConfirm | null;
  setFilter: (filter: BoardFilter) => void;
  setQuery: (query: string) => void;
  openNote: (id: string) => void;
  closeNote: () => void;
  setSettingsOpen: (open: boolean) => void;
  pushToast: (message: string, tone?: ToastTone, action?: ToastAction) => void;
  dismissToast: (id: string) => void;
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  filter: "all",
  query: "",
  selectedNoteId: null,
  settingsOpen: false,
  toasts: [],
  pendingConfirm: null,

  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  openNote: (id) => set({ selectedNoteId: id }),
  closeNote: () => set({ selectedNoteId: null }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  pushToast: (message, tone = "info", action) => {
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, message, tone, action }],
    }));
    window.setTimeout(() => {
      get().dismissToast(id);
    }, 6000);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  requestConfirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({ pendingConfirm: { options, resolve } });
    }),

  resolveConfirm: (value) => {
    const pending = get().pendingConfirm;
    if (!pending) return;
    pending.resolve(value);
    set({ pendingConfirm: null });
  },
}));
