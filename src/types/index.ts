import type { WhisperPhrase } from "../lib/whisperLibrary";

export type NoteType = "text" | "image" | "mixed" | "todo";
export type BlockType = "text" | "image" | "todo";

export interface Asset {
  id: string;
  path: string;
  relativePath: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface NoteBlock {
  id: string;
  noteId: string;
  blockType: BlockType;
  content: string;
  assetId: string | null;
  asset: Asset | null;
  sortOrder: number;
  isCompleted: boolean;
}

export interface Note {
  id: string;
  type: NoteType;
  title: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  blocks: NoteBlock[];
}

export interface NewBlockInput {
  blockType: BlockType;
  content?: string;
  assetId?: string;
  isCompleted?: boolean;
}

export interface CreateNoteInput {
  title?: string;
  blocks: NewBlockInput[];
  feedbackKind?: "note" | "todo" | "silent";
}

export interface WhisperFeedback {
  workdayKey: string;
  noteCreatedCount: number;
  todoCreatedCount: number;
  dailyMood: string;
  kind: "note" | "todo";
  isTenth: boolean;
}

export interface CreateNoteResult {
  note: Note;
  whisper: WhisperFeedback | null;
}

export interface AppInfo {
  version: string;
  dataDir: string;
  dbPath: string;
  noteCount: number;
  archivedCount: number;
  assetCount: number;
}

export type BoardFilter =
  | "all"
  | "favorites"
  | "text"
  | "todos"
  | "images"
  | "trash";

export interface WhisperEventPayload {
  phrase: WhisperPhrase;
  shownAt: number;
  noteType: "note" | "todo";
}
export type CaptureMode = "note" | "todo";

export interface PendingImage {
  assetId: string;
  assetPath: string;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
}

export interface CaptureDraft {
  text: string;
  mode: CaptureMode;
  image: PendingImage | null;
}

export interface AppSettings {
  captureShortcut?: string;
  theme?: string;
  [key: string]: string | undefined;
}
