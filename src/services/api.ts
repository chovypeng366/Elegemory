import { invoke as invokeRaw } from "@tauri-apps/api/core";
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

async function invokeReady<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      return await invokeRaw<T>(command, args);
    } catch (error) {
      lastError = error;
      if (!String(error).includes("state not managed")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError;
}

export const CAPTURE_SHORTCUT_KEY = "capture_shortcut";

export const api = {
  listNotes(): Promise<Note[]> {
    return isTauri() ? invokeReady<Note[]>("list_notes") : mockBackend.listNotes();
  },

  getNote(id: string): Promise<Note> {
    return isTauri() ? invokeReady<Note>("get_note", { id }) : mockBackend.getNote(id);
  },

  pinNoteToTop(noteId: string): Promise<void> {
    return isTauri()
      ? invokeReady<void>("pin_note_to_top", { noteId })
      : Promise.resolve();
  },

  getPinnedNoteIds(): Promise<string[]> {
    return isTauri()
      ? invokeReady<string[]>("get_pinned_note_ids")
      : mockBackend.getPinnedNoteIds();
  },

  unpinNote(noteId: string): Promise<string[]> {
    return isTauri()
      ? invokeReady<string[]>("unpin_note", { noteId })
      : mockBackend.unpinNote(noteId);
  },

  createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
    return isTauri()
      ? invokeReady<CreateNoteResult>("create_note", { input })
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
      ? invokeReady<void>("record_whisper", { input })
      : mockBackend.recordWhisper(input);
  },

  listWhisperHistory(since: number): Promise<WhisperHistoryEntry[]> {
    return isTauri()
      ? invokeReady<WhisperHistoryEntry[]>("list_whisper_history", { since })
      : mockBackend.listWhisperHistory(since);
  },

  setNoteTitle(id: string, title: string): Promise<Note> {
    return isTauri()
      ? invokeReady<Note>("set_note_title", { id, title })
      : mockBackend.setNoteTitle(id, title);
  },

  setNoteFavorite(id: string, value: boolean): Promise<Note> {
    return isTauri()
      ? invokeReady<Note>("set_note_favorite", { id, value })
      : mockBackend.setNoteFlag(id, "isFavorite", value);
  },

  setNotePinned(id: string, value: boolean): Promise<Note> {
    return isTauri()
      ? invokeReady<Note>("set_note_pinned", { id, value })
      : mockBackend.setNoteFlag(id, "isPinned", value);
  },

  setNoteArchived(id: string, value: boolean): Promise<Note> {
    return isTauri()
      ? invokeReady<Note>("set_note_archived", { id, value })
      : mockBackend.setNoteFlag(id, "isArchived", value);
  },

  deleteNote(id: string): Promise<void> {
    return isTauri()
      ? invokeReady<void>("delete_note", { id })
      : mockBackend.deleteNote(id);
  },

  addBlock(noteId: string, block: NewBlockInput): Promise<Note> {
    return isTauri()
      ? invokeReady<Note>("add_block", { noteId, block })
      : mockBackend.addBlock(noteId, block);
  },

  updateBlock(blockId: string, content: string): Promise<Note> {
    return isTauri()
      ? invokeReady<Note>("update_block", { blockId, content })
      : mockBackend.updateBlock(blockId, content);
  },

  deleteBlock(blockId: string): Promise<Note> {
    return isTauri()
      ? invokeReady<Note>("delete_block", { blockId })
      : mockBackend.deleteBlock(blockId);
  },

  toggleBlockCompleted(blockId: string): Promise<Note> {
    return isTauri()
      ? invokeReady<Note>("toggle_block_completed", { blockId })
      : mockBackend.toggleBlockCompleted(blockId);
  },

  saveImageAsset(base64: string): Promise<Asset> {
    return isTauri()
      ? invokeReady<Asset>("save_image_asset", { input: { bytes: base64 } })
      : mockBackend.saveImageAsset(base64);
  },

  getAssetDataUrl(assetId: string): Promise<string> {
    return isTauri()
      ? invokeReady<string>("get_asset_data_url", { assetId })
      : mockBackend.getAssetDataUrl(assetId);
  },

  savePngData(dataUrl: string, fileName: string): Promise<string | null> {
    return isTauri()
      ? invokeReady<string | null>("save_png_data", { dataUrl, fileName })
      : mockBackend.savePngData(dataUrl, fileName);
  },

  importImagePath(path: string): Promise<Asset> {
    return isTauri()
      ? invokeReady<Asset>("import_image_path", { path })
      : mockBackend.importImagePath();
  },

  getSettings(): Promise<Record<string, string>> {
    return isTauri()
      ? invokeReady<Record<string, string>>("get_settings")
      : mockBackend.getSettings();
  },

  getMemoryEcho(): Promise<MemoryEcho | null> {
    return isTauri()
      ? invokeReady<MemoryEcho | null>("get_memory_echo")
      : mockBackend.getMemoryEcho();
  },

  markNoteOpened(id: string): Promise<void> {
    return isTauri()
      ? invokeReady<void>("mark_note_opened", { id })
      : mockBackend.markNoteOpened(id);
  },

  listNoteLinks(noteId: string): Promise<NoteLinkEntry[]> {
    return isTauri()
      ? invokeReady<NoteLinkEntry[]>("list_note_links", { noteId })
      : mockBackend.listNoteLinks(noteId);
  },

  createNoteLink(
    noteId: string,
    relatedId: string,
    source: "manual" | "suggested" = "manual",
  ): Promise<NoteLinkEntry[]> {
    return isTauri()
      ? invokeReady<NoteLinkEntry[]>("create_note_link", {
          noteId,
          relatedId,
          source,
        })
      : mockBackend.createNoteLink(noteId, relatedId, source);
  },

  deleteNoteLink(noteId: string, relatedId: string): Promise<NoteLinkEntry[]> {
    return isTauri()
      ? invokeReady<NoteLinkEntry[]>("delete_note_link", { noteId, relatedId })
      : mockBackend.deleteNoteLink(noteId, relatedId);
  },

  findLinkSuggestions(noteId: string): Promise<LinkSuggestion[]> {
    return isTauri()
      ? invokeReady<LinkSuggestion[]>("find_link_suggestions", { noteId })
      : mockBackend.findLinkSuggestions(noteId);
  },

  findAiLinkSuggestions(noteId: string): Promise<LinkSuggestion[]> {
    return isTauri()
      ? invokeReady<LinkSuggestion[]>("find_ai_link_suggestions", { noteId })
      : mockBackend.findAiLinkSuggestions(noteId);
  },

  getLinkGraph(noteId?: string): Promise<LinkGraph> {
    return isTauri()
      ? invokeReady<LinkGraph>("get_link_graph", { noteId: noteId ?? null })
      : mockBackend.getLinkGraph(noteId);
  },

  setSetting(key: string, value: string): Promise<void> {
    return isTauri()
      ? invokeReady<void>("set_setting", { key, value })
      : mockBackend.setSetting(key, value);
  },

  setCaptureShortcut(shortcut: string): Promise<string> {
    return isTauri()
      ? invokeReady<string>("set_capture_shortcut", { shortcut })
      : mockBackend.setCaptureShortcut(shortcut);
  },

  getAppInfo(): Promise<AppInfo> {
    return isTauri()
      ? invokeReady<AppInfo>("get_app_info")
      : mockBackend.getAppInfo();
  },

  showCapture(): Promise<void> {
    return isTauri() ? invokeReady<void>("show_capture") : Promise.resolve();
  },

  hideCapture(): Promise<void> {
    return isTauri() ? invokeReady<void>("hide_capture") : Promise.resolve();
  },

  showBoard(): Promise<void> {
    return isTauri() ? invokeReady<void>("show_board") : Promise.resolve();
  },

  quitApp(): Promise<void> {
    return isTauri() ? invokeReady<void>("quit_app") : Promise.resolve();
  },
};
