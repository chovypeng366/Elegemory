import { invoke } from "@tauri-apps/api/core";
import type {
  AppInfo,
  Asset,
  CreateNoteInput,
  CreateNoteResult,
  LinkGraph,
  LinkSuggestion,
  MemoryEcho,
  NewBlockInput,
  Note,
  NoteLinkEntry,
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

  getAssetDataUrl(assetId: string): Promise<string> {
    return isTauri()
      ? invoke<string>("get_asset_data_url", { assetId })
      : mockBackend.getAssetDataUrl(assetId);
  },

  savePngData(dataUrl: string, fileName: string): Promise<string | null> {
    return isTauri()
      ? invoke<string | null>("save_png_data", { dataUrl, fileName })
      : mockBackend.savePngData(dataUrl, fileName);
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

  getMemoryEcho(): Promise<MemoryEcho | null> {
    return isTauri()
      ? invoke<MemoryEcho | null>("get_memory_echo")
      : mockBackend.getMemoryEcho();
  },

  markNoteOpened(id: string): Promise<void> {
    return isTauri()
      ? invoke<void>("mark_note_opened", { id })
      : mockBackend.markNoteOpened(id);
  },

  listNoteLinks(noteId: string): Promise<NoteLinkEntry[]> {
    return isTauri()
      ? invoke<NoteLinkEntry[]>("list_note_links", { noteId })
      : mockBackend.listNoteLinks(noteId);
  },

  createNoteLink(
    noteId: string,
    relatedId: string,
    source: "manual" | "suggested" = "manual",
  ): Promise<NoteLinkEntry[]> {
    return isTauri()
      ? invoke<NoteLinkEntry[]>("create_note_link", {
          noteId,
          relatedId,
          source,
        })
      : mockBackend.createNoteLink(noteId, relatedId, source);
  },

  deleteNoteLink(noteId: string, relatedId: string): Promise<NoteLinkEntry[]> {
    return isTauri()
      ? invoke<NoteLinkEntry[]>("delete_note_link", { noteId, relatedId })
      : mockBackend.deleteNoteLink(noteId, relatedId);
  },

  findLinkSuggestions(noteId: string): Promise<LinkSuggestion[]> {
    return isTauri()
      ? invoke<LinkSuggestion[]>("find_link_suggestions", { noteId })
      : mockBackend.findLinkSuggestions(noteId);
  },

  findAiLinkSuggestions(noteId: string): Promise<LinkSuggestion[]> {
    return isTauri()
      ? invoke<LinkSuggestion[]>("find_ai_link_suggestions", { noteId })
      : mockBackend.findAiLinkSuggestions(noteId);
  },

  getLinkGraph(noteId?: string): Promise<LinkGraph> {
    return isTauri()
      ? invoke<LinkGraph>("get_link_graph", { noteId: noteId ?? null })
      : mockBackend.getLinkGraph(noteId);
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
