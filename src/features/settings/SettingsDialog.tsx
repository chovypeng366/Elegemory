import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Check,
  Database,
  FolderOpen,
  Keyboard,
  LogOut,
  MoonStar,
  ShieldCheck,
  X,
} from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { errorMessage } from "../../lib/utils";
import { copyTextToClipboard } from "../../services/clipboard";
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

  const [shortcut, setShortcut] = useState("");
  const [saving, setSaving] = useState(false);

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
            className="relative flex max-h-[82vh] w-[560px] max-w-full flex-col overflow-hidden rounded-2xl border border-line bg-[#FBF6EC] shadow-[0_36px_70px_-28px_rgba(64,56,47,0.5)]"
          >
            <header className="flex shrink-0 items-start justify-between px-6 pb-4 pt-5">
              <div>
                <h2 className="font-serif text-[21px] tracking-[0.02em] text-ink">设置</h2>
                <p className="mt-1 text-[10.5px] text-muted/70">
                  快捷键、本地数据与扩展能力
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

              <Section icon={<MoonStar size={14} />} title="外观">
                <div className="flex items-center justify-between rounded-xl border border-line/70 bg-photo/45 px-3.5 py-3">
                  <div>
                    <p className="text-[11.5px] text-ink/85">暖色纸张（当前）</p>
                    <p className="mt-0.5 text-[10px] text-muted/65">
                      明暗主题会在后续版本开放
                    </p>
                  </div>
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Check size={13} />
                  </span>
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
