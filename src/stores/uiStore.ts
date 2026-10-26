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
  dateFilter: string;
  selectedNoteId: string | null;
  settingsOpen: boolean;
  dayCanvasDate: string | null;
  linkGraphOpen: boolean;
  linkGraphFocusId: string | null;
  noteReturnGraphFocus: string | null;
  toasts: Toast[];
  pendingConfirm: PendingConfirm | null;
  setFilter: (filter: BoardFilter) => void;
  setQuery: (query: string) => void;
  setDateFilter: (date: string) => void;
  openNote: (id: string) => void;
  openNoteFromGraph: (id: string, graphFocusId: string) => void;
  closeNote: () => void;
  setSettingsOpen: (open: boolean) => void;
  openDayCanvas: (date: string) => void;
  closeDayCanvas: () => void;
  openLinkGraph: (focusId?: string) => void;
  closeLinkGraph: () => void;
  returnToLinkGraph: () => void;
  pushToast: (message: string, tone?: ToastTone, action?: ToastAction) => void;
  dismissToast: (id: string) => void;
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  filter: "all",
  query: "",
  dateFilter: "",
  selectedNoteId: null,
  settingsOpen: false,
  dayCanvasDate: null,
  linkGraphOpen: false,
  linkGraphFocusId: null,
  noteReturnGraphFocus: null,
  toasts: [],
  pendingConfirm: null,

  setFilter: (filter) => set({ filter }),
  setQuery: (query) => set({ query }),
  setDateFilter: (dateFilter) => set({ dateFilter }),
  openNote: (id) => set({ selectedNoteId: id, noteReturnGraphFocus: null }),
  openNoteFromGraph: (id, graphFocusId) =>
    set({
      selectedNoteId: id,
      noteReturnGraphFocus: graphFocusId,
      linkGraphOpen: false,
      linkGraphFocusId: null,
    }),
  closeNote: () =>
    set({ selectedNoteId: null, noteReturnGraphFocus: null }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  openDayCanvas: (date) => set({ dayCanvasDate: date }),
  closeDayCanvas: () => set({ dayCanvasDate: null }),
  openLinkGraph: (focusId) =>
    set({ linkGraphOpen: true, linkGraphFocusId: focusId ?? null }),
  closeLinkGraph: () =>
    set({ linkGraphOpen: false, linkGraphFocusId: null }),
  returnToLinkGraph: () =>
    set((state) => ({
      selectedNoteId: null,
      linkGraphOpen: true,
      linkGraphFocusId: state.noteReturnGraphFocus,
      noteReturnGraphFocus: null,
    })),

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
