import { invoke } from "@tauri-apps/api/core";
import type { Note } from "../../types";
import { isTauri } from "../env";

export interface AiGenerationOptions {
  maxLength?: number;
  language?: "zh" | "en";
}

export interface AiStatus {
  configured: boolean;
  enabled: boolean;
  model: string;
}

export interface AiTestResult {
  model: string;
  latencyMs: number;
  reply: string;
}

export interface AiProvider {
  readonly id: string;
  readonly label: string;
  status(): Promise<AiStatus>;
  saveKey(key: string): Promise<AiStatus>;
  clearKey(): Promise<AiStatus>;
  test(): Promise<AiTestResult>;
  suggestTitle(text: string, options?: AiGenerationOptions): Promise<string>;
  summarize(notes: Note[], options?: AiGenerationOptions): Promise<string>;
  extractTodos(text: string): Promise<string[]>;
}

export interface AiProviderConfig {
  providerId: "deepseek";
  baseUrl: string;
  model: string;
}

export const AI_SETTING_KEYS = {
  enabled: "ai_enabled",
  model: "ai_model",
} as const;

export const defaultAiConfig: AiProviderConfig = {
  providerId: "deepseek",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
};

function noteText(notes: Note[]): string {
  return notes
    .flatMap((note) =>
      note.blocks
        .filter((block) => block.blockType !== "image" && block.content.trim())
        .map((block) => block.content.trim()),
    )
    .join("\n\n");
}

let mockConfigured = false;
let mockEnabled = false;

const mockStatus = (): AiStatus => ({
  configured: mockConfigured,
  enabled: mockEnabled,
  model: defaultAiConfig.model,
});

async function invokeOr<T>(command: string, args: Record<string, unknown>, fallback: () => T) {
  return isTauri() ? invoke<T>(command, args) : fallback();
}

export const deepSeekProvider: AiProvider = {
  id: defaultAiConfig.providerId,
  label: "DeepSeek",

  status: () => invokeOr("ai_status", {}, mockStatus),

  saveKey: (key) =>
    invokeOr<AiStatus>("ai_save_key", { key }, () => {
      mockConfigured = key.trim().length >= 8;
      if (mockConfigured) mockEnabled = true;
      return mockStatus();
    }),

  clearKey: () =>
    invokeOr<AiStatus>("ai_clear_key", {}, () => {
      mockConfigured = false;
      mockEnabled = false;
      return mockStatus();
    }),

  test: () =>
    invokeOr<AiTestResult>("ai_test", {}, () => ({
      model: defaultAiConfig.model,
      latencyMs: 420,
      reply: "OK",
    })),

  suggestTitle: (text) =>
    invokeOr<string>("ai_suggest_title", { text }, () => "山间清晨的散步计划"),

  summarize: (notes) =>
    invokeOr<string>(
      "ai_summarize",
      { text: noteText(notes) },
      () => "把山雾、方案第二稿和一段散步时间收进同一天，也给未完成的小事留了位置。",
    ),

  extractTodos: (text) =>
    invokeOr<string[]>("ai_extract_todos", { text }, () => [
      "完成方案第二稿",
      "留一点时间散步",
    ]),
};
