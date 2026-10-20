import type { Note } from "../../types";

export interface AiGenerationOptions {
  maxLength?: number;
  language?: "zh" | "en";
}

export interface AiProvider {
  readonly id: string;
  readonly label: string;
  suggestTitle(text: string, options?: AiGenerationOptions): Promise<string>;
  summarize(notes: Note[], options?: AiGenerationOptions): Promise<string>;
  extractTodos(text: string): Promise<string[]>;
  suggestTags(text: string): Promise<string[]>;
  search(query: string, notes: Note[]): Promise<Note[]>;
}

export interface AiProviderConfig {
  providerId: "deepseek";
  baseUrl: string;
  model: string;
}

export const defaultAiConfig: AiProviderConfig = {
  providerId: "deepseek",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-chat",
};

// AI 功能默认不启用。接入时实现 AiProvider，并通过安全的凭据存储读取 API Key，
// 绝不能把密钥写进前端代码或仓库。
