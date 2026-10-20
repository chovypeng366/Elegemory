import { invoke } from "@tauri-apps/api/core";
import type {
  AppInfo,
  Asset,
  CreateNoteInput,
  CreateNoteResult,
  NewBlockInput,
  Note,
} from "../types";
import type { WhisperHistoryEntry } from "../lib/whisperEngine";
import { isTauri } from "./env";
import { mockBackend } from "./mock";

export const CAPTURE_SHORTCUT_KEY = "capture_shortcut";

export const api = {
  listNotes(): Promise<Note[]> {
    return isTauri() ? invoke<Note[]>("list_notes") : mockBackend.listNotes();
  },

  createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
    return isTauri()
      ? invoke<CreateNoteResult>("create_note", { input })
      : mockBackend.createNote(input);
  },

  recordWhisper(input: {
    phraseId: string;
    category: string;
    noteType: "note" | "todo";
    shownAt: number;
    workdayKey: string;
  }): Promise<void> {
    return isTauri()
      ? invoke<void>("record_whisper", { input })
      : mockBackend.recordWhisper(input);
  },

  listWhisperHistory(since: number): Promise<WhisperHistoryEntry[]> {
    return isTauri()
      ? invoke<WhisperHistoryEntry[]>("list_whisper_history", { since })
      : mockBackend.listWhisperHistory(since);
  },

  setNoteTitle(id: string, title: string): Promise<Note> {
    return isTauri()
      ? invoke<Note>("set_note_title", { id, title })
      : mockBackend.setNoteTitle(id, title);
  },

  setNoteFavorite(id: string, value: boolean): Promise<Note> {
    return isTauri()
      ? invoke<Note>("set_note_favorite", { id, value })
      : mockBackend.setNoteFlag(id, "isFavorite", value);
  },

  setNotePinned(id: string, value: boolean): Promise<Note> {
    return isTauri()
      ? invoke<Note>("set_note_pinned", { id, value })
      : mockBackend.setNoteFlag(id, "isPinned", value);
  },

  setNoteArchived(id: string, value: boolean): Promise<Note> {
    return isTauri()
      ? invoke<Note>("set_note_archived", { id, value })
      : mockBackend.setNoteFlag(id, "isArchived", value);
  },

  deleteNote(id: string): Promise<void> {
    return isTauri()
      ? invoke<void>("delete_note", { id })
      : mockBackend.deleteNote(id);
  },

  addBlock(noteId: string, block: NewBlockInput): Promise<Note> {
    return isTauri()
      ? invoke<Note>("add_block", { noteId, block })
      : mockBackend.addBlock(noteId, block);
  },

  updateBlock(blockId: string, content: string): Promise<Note> {
    return isTauri()
      ? invoke<Note>("update_block", { blockId, content })
      : mockBackend.updateBlock(blockId, content);
  },

  deleteBlock(blockId: string): Promise<Note> {
    return isTauri()
      ? invoke<Note>("delete_block", { blockId })
      : mockBackend.deleteBlock(blockId);
  },

  toggleBlockCompleted(blockId: string): Promise<Note> {
    return isTauri()
      ? invoke<Note>("toggle_block_completed", { blockId })
      : mockBackend.toggleBlockCompleted(blockId);
  },

  saveImageAsset(base64: string): Promise<Asset> {
    return isTauri()
      ? invoke<Asset>("save_image_asset", { input: { bytes: base64 } })
      : mockBackend.saveImageAsset(base64);
  },

  importImagePath(path: string): Promise<Asset> {
    return isTauri()
      ? invoke<Asset>("import_image_path", { path })
      : mockBackend.importImagePath();
  },

  getSettings(): Promise<Record<string, string>> {
    return isTauri()
      ? invoke<Record<string, string>>("get_settings")
      : mockBackend.getSettings();
  },

  setSetting(key: string, value: string): Promise<void> {
    return isTauri()
      ? invoke<void>("set_setting", { key, value })
      : mockBackend.setSetting(key, value);
  },

  setCaptureShortcut(shortcut: string): Promise<string> {
    return isTauri()
      ? invoke<string>("set_capture_shortcut", { shortcut })
      : mockBackend.setCaptureShortcut(shortcut);
  },

  getAppInfo(): Promise<AppInfo> {
    return isTauri()
      ? invoke<AppInfo>("get_app_info")
      : mockBackend.getAppInfo();
  },

  showCapture(): Promise<void> {
    return isTauri() ? invoke<void>("show_capture") : Promise.resolve();
  },

  hideCapture(): Promise<void> {
    return isTauri() ? invoke<void>("hide_capture") : Promise.resolve();
  },

  showBoard(): Promise<void> {
    return isTauri() ? invoke<void>("show_board") : Promise.resolve();
  },

  quitApp(): Promise<void> {
    return isTauri() ? invoke<void>("quit_app") : Promise.resolve();
  },
};
