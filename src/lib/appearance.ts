export const THEME_PRESETS = [
  {
    id: "warm",
    label: "暖纸",
    swatches: ["#F5F0E8", "#FFF5DF", "#B8895A"],
  },
  {
    id: "mist",
    label: "雾蓝",
    swatches: ["#EDF1F0", "#F8FBF7", "#7C9D92"],
  },
  {
    id: "sand",
    label: "沙丘",
    swatches: ["#F2E8D8", "#FFF3DD", "#B07D4C"],
  },
  {
    id: "clay",
    label: "陶土",
    swatches: ["#F3EBE7", "#FFF4EF", "#B77C68"],
  },
] as const;

export type ThemeId = (typeof THEME_PRESETS)[number]["id"];

export const DEFAULT_THEME: ThemeId = "warm";

export const MAGNET_COLORS = [
  { label: "青瓷", value: "#829D97" },
  { label: "赤陶", value: "#B46C55" },
  { label: "黄铜", value: "#B08A4F" },
  { label: "墨蓝", value: "#4D6473" },
  { label: "鼠尾草", value: "#8A9C7E" },
  { label: "豆沙", value: "#B07D82" },
  { label: "石墨", value: "#5B5651" },
] as const;

export const DEFAULT_MAGNET_COLOR = MAGNET_COLORS[0].value;

export const APPEARANCE_KEYS = {
  theme: "theme",
  magnet: "magnet_color",
  background: "background_image",
  backgroundOpacity: "background_opacity",
  boardOrder: "board_order",
} as const;

export const DEFAULT_BACKGROUND_OPACITY = 0.22;

export function resolveTheme(value?: string): ThemeId {
  return THEME_PRESETS.some((preset) => preset.id === value)
    ? (value as ThemeId)
    : DEFAULT_THEME;
}

export function resolveMagnetColor(value?: string): string {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return DEFAULT_MAGNET_COLOR;
}

export function clampBackgroundOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BACKGROUND_OPACITY;
  return Math.min(0.65, Math.max(0.05, value));
}

export function magnetGradient(color: string): string {
  return `radial-gradient(circle at 34% 28%, color-mix(in srgb, ${color} 35%, white) 0%, ${color} 55%, color-mix(in srgb, ${color} 62%, black) 100%)`;
}

export function applyAppearance(settings: Record<string, string>): void {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(settings[APPEARANCE_KEYS.theme]);
  root.style.setProperty(
    "--magnet-color",
    resolveMagnetColor(settings[APPEARANCE_KEYS.magnet]),
  );
}

export function parseBoardOrder(raw?: string): Record<string, string[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      result[key] = value.filter((item): item is string => typeof item === "string");
    }
    return result;
  } catch {
    return {};
  }
}
