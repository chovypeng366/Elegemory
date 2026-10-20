import type { CSSProperties } from "react";
import type { Asset, Note, NoteBlock } from "../types";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function tiltStyle(seed: string): CSSProperties {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000;
  }
  const tilt = ((hash % 25) - 12) / 10;
  return { "--tilt": `${tilt}deg` } as CSSProperties;
}

export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "发生了未知错误，请稍后再试";
}

export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${formatClock(timestamp)}`;
}

export function formatShortTimestamp(timestamp: number): string {
  const now = Date.now();
  if (startOfDay(now) <= timestamp) return formatClock(timestamp);
  return formatDateLabel(timestamp);
}

export interface TimelineGroup {
  key: string;
  label: string;
  hint?: string;
  notes: Note[];
}

export function groupByDate(notes: Note[]): TimelineGroup[] {
  const now = Date.now();
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;
  const groups: TimelineGroup[] = [];

  const bucket = (key: string, label: string, hint?: string) => {
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, label, hint, notes: [] };
      groups.push(group);
    }
    return group;
  };

  const dateKey = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  for (const note of notes) {
    const created = note.createdAt;
    if (created >= todayStart) {
      bucket(`day:${dateKey(todayStart)}`, "今天").notes.push(note);
    } else if (created >= yesterdayStart) {
      bucket(`day:${dateKey(yesterdayStart)}`, "昨天").notes.push(note);
    } else if (created >= weekStart) {
      bucket(`week:${dateKey(weekStart)}`, "最近一周").notes.push(note);
    } else {
      const date = new Date(created);
      const key = `month:${date.getFullYear()}-${date.getMonth() + 1}`;
      bucket(key, `${date.getFullYear()}年${date.getMonth() + 1}月`).notes.push(note);
    }
  }

  return groups;
}

export function orderNotes(notes: Note[], orderIds?: string[]): Note[] {
  if (!orderIds?.length) return notes;

  const rank = new Map(orderIds.map((id, index) => [id, index]));
  const ordered = notes
    .filter((note) => rank.has(note.id))
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  const unordered = notes.filter((note) => !rank.has(note.id));

  return [...unordered, ...ordered];
}

export function noteText(note: Note): string {
  return note.blocks
    .filter((block) => block.blockType !== "image" && block.content.trim())
    .map((block) => block.content)
    .join("\n");
}

export function notePlainText(note: Note): string {
  return note.blocks
    .filter((block) => block.blockType !== "image")
    .map((block) => block.content)
    .join("\n\n");
}

export function firstImage(note: Note): Asset | null {
  for (const block of note.blocks) {
    if (block.asset) return block.asset;
  }
  return null;
}

export function textBlocks(note: Note): NoteBlock[] {
  return note.blocks.filter(
    (block) => block.blockType === "text" && block.content.trim(),
  );
}

export function todoBlocks(note: Note): NoteBlock[] {
  return note.blocks.filter((block) => block.blockType === "todo");
}

export function hasTodo(note: Note): boolean {
  return note.blocks.some((block) => block.blockType === "todo");
}

export function hasImage(note: Note): boolean {
  return note.blocks.some((block) => Boolean(block.asset));
}

export function isTextNote(note: Note): boolean {
  return !hasImage(note) && !hasTodo(note);
}

export function displayTitle(note: Note): string {
  const title = note.title.trim();
  if (title) return title;
  const text = noteText(note).trim();
  return text ? text.slice(0, 40) : "无标题速记";
}

export function typeLabel(note: Note): string {
  switch (note.type) {
    case "todo":
      return "待办";
    case "image":
      return "图片";
    case "mixed":
      return "图文";
    default:
      return "文字";
  }
}

export function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length)}…`;
}
