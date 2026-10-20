import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Check,
  Database,
  FolderOpen,
  Image as ImageIcon,
  Keyboard,
  Loader2,
  LogOut,
  Palette,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { IconButton } from "../../components/IconButton";
import {
  APPEARANCE_KEYS,
  DEFAULT_BACKGROUND_OPACITY,
  MAGNET_COLORS,
  THEME_PRESETS,
  clampBackgroundOpacity,
  magnetGradient,
  resolveMagnetColor,
  resolveTheme,
} from "../../lib/appearance";
import { assetSrc } from "../../lib/assets";
import { cn, errorMessage } from "../../lib/utils";
import { api } from "../../services/api";
import {
  copyTextToClipboard,
  imageBlobToPng,
} from "../../services/clipboard";
import { quitApp } from "../../services/system";
import {
  captureShortcutLabel,
  useSettingsStore,
} from "../../stores/settingsStore";
import { useUiStore } from "../../stores/uiStore";

export function SettingsDialog() {
  const open = useUiStore((state) => state.settingsOpen);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const pushToast = useUiStore((state) => state.pushToast);
  const requestConfirm = useUiStore((state) => state.requestConfirm);

  const settings = useSettingsStore((state) => state.settings);
  const appInfo = useSettingsStore((state) => state.appInfo);
  const load = useSettingsStore((state) => state.load);
  const updateShortcut = useSettingsStore((state) => state.updateShortcut);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  const [shortcut, setShortcut] = useState("");
  const [saving, setSaving] = useState(false);
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const theme = resolveTheme(settings[APPEARANCE_KEYS.theme]);
  const themeLabel =
    THEME_PRESETS.find((preset) => preset.id === theme)?.label ?? "暖纸";
  const magnet = resolveMagnetColor(settings[APPEARANCE_KEYS.magnet]);
  const magnetLabel =
    MAGNET_COLORS.find((preset) => preset.value === magnet)?.label ?? "青瓷";
  const background = settings[APPEARANCE_KEYS.background] ?? "";
  const savedBackgroundOpacity = clampBackgroundOpacity(
    Number(
      settings[APPEARANCE_KEYS.backgroundOpacity] ?? DEFAULT_BACKGROUND_OPACITY,
    ),
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState(savedBackgroundOpacity);

  useEffect(() => {
    if (open) setBackgroundOpacity(savedBackgroundOpacity);
  }, [open, savedBackgroundOpacity]);

  useEffect(() => {
    if (!open) return;
    void load(true);
  }, [open, load]);

  useEffect(() => {
    if (open) setShortcut(captureShortcutLabel(settings));
  }, [open, settings]);

  const close = () => setSettingsOpen(false);

  const handleSaveShortcut = async () => {
    if (saving) return;
    setSaving(true);
    await updateShortcut(shortcut);
    setSaving(false);
  };

  const handleCopyPath = async () => {
    if (!appInfo?.dataDir) return;
    try {
      await copyTextToClipboard(appInfo.dataDir);
      pushToast("数据目录已复制", "success");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  };

  const handleBackgroundUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      pushToast("请选择 PNG、JPEG 或 WebP 图片", "error");
      return;
    }

    setBackgroundBusy(true);
    try {
      const encoded = await imageBlobToPng(file);
      const asset = await api.saveImageAsset(encoded.base64);
      await updateSetting(APPEARANCE_KEYS.background, asset.path);
      if (settings[APPEARANCE_KEYS.backgroundOpacity] === undefined) {
        await updateSetting(
          APPEARANCE_KEYS.backgroundOpacity,
          String(backgroundOpacity),
        );
      }
      pushToast("背景图片已更新", "success");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBackgroundBusy(false);
    }
  };

  const handleRemoveBackground = async () => {
    await updateSetting(APPEARANCE_KEYS.background, "");
    pushToast("已恢复纯色纸张背景", "info");
  };

  const handleOpacityChange = (value: number) => {
    const next = clampBackgroundOpacity(value);
    setBackgroundOpacity(next);
    void updateSetting(APPEARANCE_KEYS.backgroundOpacity, String(next));
  };

  const handleQuit = async () => {
    const confirmed = await requestConfirm({
      title: "退出 Elegemory？",
      description: "应用会退出到桌面，速记窗口里未保存的草稿会保留到下次打开。",
      confirmLabel: "退出应用",
    });
    if (confirmed) {
      await quitApp();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="settings"
          className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="关闭设置"
            className="absolute inset-0 bg-ink/15 backdrop-blur-[2px]"
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="设置"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 330, damping: 30 }}
            className="relative flex max-h-[82vh] w-[560px] max-w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_36px_70px_-28px_rgba(64,56,47,0.5)]"
          >
            <header className="flex shrink-0 items-start justify-between px-6 pb-4 pt-5">
              <div>
                <h2 className="font-serif text-[21px] tracking-[0.02em] text-ink">设置</h2>
                <p className="mt-1 text-[10.5px] text-muted/70">
                  快捷键、外观与本地数据
                </p>
              </div>
              <IconButton label="关闭" onClick={close}>
                <X size={16} />
              </IconButton>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
              <Section icon={<Keyboard size={14} />} title="速记快捷键">
                <div className="flex items-center gap-2">
                  <input
                    value={shortcut}
                    onChange={(event) => setShortcut(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleSaveShortcut();
                    }}
                    spellCheck={false}
                    placeholder="Ctrl+Shift+Space"
                    className="search-field h-9 flex-1 rounded-lg px-3 font-mono text-[12px] tracking-[0.04em] text-ink outline-none placeholder:text-muted/40"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveShortcut()}
                    className="primary-button focus-ring flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[11.5px] font-medium disabled:cursor-wait"
                  >
                    {saving ? "保存中" : "保存"}
                  </button>
                </div>
                <p className="mt-2 text-[10.5px] leading-5 text-muted/70">
                  用于唤出 / 收起速记窗口。支持 Ctrl、Alt、Shift、Space、字母与数字组合，例如
                  <span className="kbd mx-1">Ctrl+Shift+Space</span>。
                </p>
              </Section>

              <Section icon={<Database size={14} />} title="本地数据">
                <div className="rounded-xl border border-line/70 bg-photo/55 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted">
                      <FolderOpen size={13} className="shrink-0" />
                      <span className="truncate">应用数据目录</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyPath()}
                      className="focus-ring shrink-0 rounded-md px-2 py-1 text-[10.5px] text-accent-deep transition-colors hover:bg-accent/10"
                    >
                      复制路径
                    </button>
                  </div>
                  <p className="mt-1.5 break-all font-mono text-[10px] leading-5 text-muted/65">
                    {appInfo?.dataDir ?? "读取中…"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Stat label="记录" value={appInfo?.noteCount ?? 0} />
                    <Stat label="图片" value={appInfo?.assetCount ?? 0} />
                    <Stat label="回收站" value={appInfo?.archivedCount ?? 0} />
                    <span className="flex items-center gap-1 rounded-md bg-pin/10 px-2 py-1 text-[9.5px] text-pin">
                      <ShieldCheck size={10} />
                      SQLite · 仅本机
                    </span>
                  </div>
                </div>
              </Section>

              <Section icon={<Palette size={14} />} title="外观">
                <div className="space-y-4 rounded-xl border border-line/70 bg-photo/45 p-3.5">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-medium tracking-[0.12em] text-muted/65">
                        纸张主题
                      </span>
                      <span className="text-[9.5px] text-muted/50">{themeLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {THEME_PRESETS.map((preset) => {
                        const active = theme === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              void updateSetting(APPEARANCE_KEYS.theme, preset.id)
                            }
                            className={cn(
                              "focus-ring flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors",
                              active
                                ? "border-accent/45 bg-photo shadow-sm"
                                : "border-line/60 bg-canvas/20 hover:bg-photo/60",
                            )}
                          >
                            <span className="flex shrink-0 items-center">
                              {preset.swatches.map((color, index) => (
                                <span
                                  key={`${preset.id}-${color}`}
                                  className={cn(
                                    "size-4 rounded-full ring-1 ring-black/5",
                                    index > 0 && "-ml-1.5",
                                  )}
                                  style={{ background: color }}
                                />
                              ))}
                            </span>
                            <span className="text-[10.5px] text-ink/80">
                              {preset.label}
                            </span>
                            {active && (
                              <Check size={11} className="ml-auto shrink-0 text-accent" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-medium tracking-[0.12em] text-muted/65">
                        磁扣颜色
                      </span>
                      <span className="text-[9.5px] text-muted/50">{magnetLabel}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {MAGNET_COLORS.map((color) => {
                        const active =
                          magnet.toLowerCase() === color.value.toLowerCase();
                        return (
                          <button
                            key={color.value}
                            type="button"
                            title={color.label}
                            aria-label={`磁扣颜色：${color.label}`}
                            aria-pressed={active}
                            onClick={() =>
                              void updateSetting(APPEARANCE_KEYS.magnet, color.value)
                            }
                            className={cn(
                              "focus-ring flex size-8 items-center justify-center rounded-full border-2 transition-all",
                              active
                                ? "border-accent shadow-sm"
                                : "border-transparent hover:border-line",
                            )}
                          >
                            <span
                              className="size-6 rounded-full ring-1 ring-black/5"
                              style={{ background: magnetGradient(color.value) }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-medium tracking-[0.12em] text-muted/65">
                        自定义背景
                      </span>
                      <span className="text-[9.5px] text-muted/50">
                        PNG / JPG / WebP
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg border border-line/60 bg-canvas/25 p-2.5">
                      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-line/50 bg-canvas-deep/50">
                        {background ? (
                          <img
                            src={assetSrc(background)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted/35">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10.5px] text-ink/80">
                          {background ? "背景图片已启用" : "把一张图片铺在白板后面"}
                        </p>
                        <p className="mt-0.5 text-[9.5px] leading-4 text-muted/60">
                          图片只保存在本机，不会上传。
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={backgroundBusy}
                          onClick={() => backgroundInputRef.current?.click()}
                          className="ghost-button focus-ring flex h-7 items-center gap-1 rounded-md px-2 text-[9.5px] disabled:opacity-60"
                        >
                          {backgroundBusy ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <ImageIcon size={10} />
                          )}
                          {background ? "更换" : "上传"}
                        </button>
                        {background && (
                          <button
                            type="button"
                            aria-label="移除背景"
                            onClick={() => void handleRemoveBackground()}
                            className="focus-ring flex size-7 items-center justify-center rounded-md text-muted/60 transition-colors hover:bg-[#B85C4A]/10 hover:text-[#a0503f]"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={backgroundInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => void handleBackgroundUpload(event)}
                    />
                    {background && (
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <span className="text-[9.5px] text-muted/60">
                          背景透明度
                        </span>
                        <input
                          type="range"
                          min={5}
                          max={60}
                          step={5}
                          value={Math.round(backgroundOpacity * 100)}
                          onChange={(event) =>
                            handleOpacityChange(Number(event.target.value) / 100)
                          }
                          className="h-1 flex-1 accent-[var(--color-accent)]"
                        />
                        <span className="w-8 text-right text-[9.5px] tabular-nums text-muted/60">
                          {Math.round(backgroundOpacity * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Section>

              <Section icon={<Bot size={14} />} title="AI 能力（预留）">
                <div className="rounded-xl border border-dashed border-line bg-canvas/30 px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11.5px] text-ink/80">智能标题与整理</p>
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[9.5px] tracking-[0.06em] text-muted/70">
                      未启用
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-5 text-muted/65">
                    未来将接入可配置的 AI Provider。只有在你明确触发时才会发送指定内容，默认保持关闭。
                  </p>
                </div>
              </Section>

              <Section icon={<LogOut size={14} />} title="退出">
                <div className="flex items-center justify-between rounded-xl border border-line/70 bg-photo/45 px-3.5 py-3">
                  <p className="text-[10.5px] leading-5 text-muted/70">
                    点击窗口右上角只会收起应用。需要完全退出时，使用这里或托盘菜单。
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleQuit()}
                    className="focus-ring ml-3 flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#B85C4A]/10 px-3 text-[11px] text-[#a0503f] transition-colors hover:bg-[#B85C4A]/16"
                  >
                    <LogOut size={11} />
                    退出 Elegemory
                  </button>
                </div>
              </Section>
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-line/70 px-6 py-3 text-[9.5px] text-muted/55">
              <span>Elegemory v{appInfo?.version ?? "0.1.0"}</span>
              <span>本地优先 · 无账号 · 离线可用</span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted/65">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 rounded-md bg-canvas px-2 py-1 text-[9.5px] text-muted/75">
      {label}
      <span className="tabular-nums text-ink/70">{value}</span>
    </span>
  );
}
