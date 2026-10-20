import { create } from "zustand";
import { errorMessage } from "../lib/utils";
import { api } from "../services/api";
import type { CreateNoteInput, NewBlockInput, Note } from "../types";
import { useUiStore } from "./uiStore";

interface NotesState {
  notes: Note[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: (silent?: boolean) => Promise<void>;
  createNote: (input: CreateNoteInput) => Promise<Note | null>;
  updateTitle: (id: string, title: string) => Promise<Note | null>;
  toggleFavorite: (note: Note) => Promise<Note | null>;
  togglePinned: (note: Note) => Promise<Note | null>;
  archiveNote: (note: Note) => Promise<Note | null>;
  restoreNote: (note: Note) => Promise<Note | null>;
  deleteNotePermanently: (note: Note) => Promise<boolean>;
  addBlock: (noteId: string, block: NewBlockInput) => Promise<Note | null>;
  saveBlockContent: (blockId: string, content: string) => Promise<Note | null>;
  removeBlock: (blockId: string) => Promise<Note | null>;
  toggleTodo: (blockId: string) => Promise<Note | null>;
}

function upsert(notes: Note[], note: Note): Note[] {
  const index = notes.findIndex((item) => item.id === note.id);
  if (index === -1) return [note, ...notes];
  const next = [...notes];
  next[index] = note;
  return next;
}

function notifyError(error: unknown) {
  useUiStore.getState().pushToast(errorMessage(error), "error");
}

export const useNotesStore = create<NotesState>((set, get) => {
  const apply = async (task: () => Promise<Note>): Promise<Note | null> => {
    try {
      const note = await task();
      set((state) => ({ notes: upsert(state.notes, note), error: null }));
      return note;
    } catch (error) {
      notifyError(error);
      return null;
    }
  };

  return {
    notes: [],
    loading: false,
    loaded: false,
    error: null,

    async load(silent = false) {
      if (!silent) set({ loading: !get().loaded });
      try {
        const notes = await api.listNotes();
        set({ notes, loaded: true, error: null, loading: false });
      } catch (error) {
        set({ loading: false, error: errorMessage(error) });
        if (!silent) notifyError(error);
      }
    },

    async createNote(input) {
      try {
        const result = await api.createNote(input);
        const note = result.note;
        set((state) => ({ notes: upsert(state.notes, note), error: null }));
        return note;
      } catch (error) {
        notifyError(error);
        return null;
      }
    },

    updateTitle(id, title) {
      return apply(() => api.setNoteTitle(id, title));
    },

    toggleFavorite(note) {
      return apply(() => api.setNoteFavorite(note.id, !note.isFavorite));
    },

    togglePinned(note) {
      return apply(() => api.setNotePinned(note.id, !note.isPinned));
    },

    async archiveNote(note) {
      const updated = await apply(() => api.setNoteArchived(note.id, true));
      if (updated) {
        useUiStore.getState().pushToast("已移入回收站", "info", {
          label: "撤销",
          onClick: () => {
            void get().restoreNote(updated);
          },
        });
      }
      return updated;
    },

    async restoreNote(note) {
      const updated = await apply(() => api.setNoteArchived(note.id, false));
      if (updated) {
        useUiStore.getState().pushToast("已恢复到记忆白板", "success");
      }
      return updated;
    },

    async deleteNotePermanently(note) {
      try {
        await api.deleteNote(note.id);
        set((state) => ({
          notes: state.notes.filter((item) => item.id !== note.id),
        }));
        useUiStore.getState().pushToast("已永久删除", "info");
        return true;
      } catch (error) {
        notifyError(error);
        return false;
      }
    },

    addBlock(noteId, block) {
      return apply(() => api.addBlock(noteId, block));
    },

    saveBlockContent(blockId, content) {
      return apply(() => api.updateBlock(blockId, content));
    },

    removeBlock(blockId) {
      return apply(() => api.deleteBlock(blockId));
    },

    toggleTodo(blockId) {
      return apply(() => api.toggleBlockCompleted(blockId));
    },
  };
});
