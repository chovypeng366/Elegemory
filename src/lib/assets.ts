import { convertFileSrc } from "@tauri-apps/api/core";
import { isTauri } from "../services/env";

export function assetSrc(path?: string | null): string {
  if (!path) return "";
  if (
    path.startsWith("data:") ||
    path.startsWith("blob:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  return isTauri() ? convertFileSrc(path) : path;
}
