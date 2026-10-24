import { useEffect, useState } from "react";
import { Bot, Check, KeyRound, Loader2, ShieldCheck, Trash2, Wifi } from "lucide-react";
import { cn } from "../../lib/utils";
import { AI_SETTING_KEYS } from "../../services/ai/provider";
import { useAiStore } from "../../stores/aiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUiStore } from "../../stores/uiStore";

export function AiSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const pushToast = useUiStore((state) => state.pushToast);
  const requestConfirm = useUiStore((state) => state.requestConfirm);

  const status = useAiStore((state) => state.status);
  const refresh = useAiStore((state) => state.refresh);
  const saveKey = useAiStore((state) => state.saveKey);
  const clearKey = useAiStore((state) => state.clearKey);
  const test = useAiStore((state) => state.test);

  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "clear" | null>(null);

  const enabled = status?.enabled ?? settings[AI_SETTING_KEYS.enabled] === "1";
  const configured = status?.configured ?? false;
  const model = status?.model ?? settings[AI_SETTING_KEYS.model] ?? "deepseek-chat";

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async () => {
    const candidate = key.trim();
    if (candidate.length < 8) {
      pushToast("请填写有效的 DeepSeek API 密钥", "error");
      return;
    }
    setBusy("save");
    const saved = await saveKey(candidate);
    if (saved) {
      setKey("");
      await updateSetting(AI_SETTING_KEYS.enabled, "1");
      pushToast("API 密钥已保存到系统凭据存储", "success");
    }
    setBusy(null);
  };

  const handleTest = async () => {
    setBusy("test");
    const result = await test();
    if (result) {
      pushToast(`连接成功 · ${result.model} · ${result.latencyMs} ms`, "success");
    }
    setBusy(null);
  };

  const handleClear = async () => {
    const confirmed = await requestConfirm({
      title: "移除 DeepSeek API 密钥？",
      description: "密钥会从 Windows 凭据管理器删除，AI 功能将暂停使用。",
      confirmLabel: "移除密钥",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusy("clear");
    const cleared = await clearKey();
    if (cleared) {
      await updateSetting(AI_SETTING_KEYS.enabled, "0");
      pushToast("API 密钥已移除", "info");
    }
    setBusy(null);
  };

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted/65">
        <Bot size={14} />
        AI 能力
      </div>

      <div className="space-y-3.5 rounded-xl border border-line/70 bg-photo/45 p-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] text-ink/85">启用 AI 整理</p>
            <p className="mt-0.5 text-[9.5px] leading-4 text-muted/60">
              生成标题、摘要，或从记录中提取待办。
            </p>
          </div>
          <Toggle
            label="启用 AI 整理"
            checked={enabled}
            onChange={(value) =>
              void updateSetting(AI_SETTING_KEYS.enabled, value ? "1" : "0")
            }
          />
        </div>

        <div className="h-px bg-line/60" />

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <p className="text-[10.5px] text-ink/80">DeepSeek API 密钥</p>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] tracking-[0.05em]",
                configured ? "bg-pin/10 text-pin" : "bg-ink/5 text-muted/65",
              )}
            >
              {configured ? <Check size={9} /> : <KeyRound size={9} />}
              {configured ? "已配置" : "未配置"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSave();
              }}
              placeholder={configured ? "已保存，输入新密钥可替换" : "sk-..."}
              autoComplete="off"
              spellCheck={false}
              className="search-field h-9 min-w-0 flex-1 rounded-lg px-3 font-mono text-[11px] tracking-[0.02em] text-ink outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted/40"
            />
            <button
              type="button"
              disabled={busy !== null || key.trim().length < 8}
              onClick={() => void handleSave()}
              className="primary-button focus-ring h-9 shrink-0 rounded-lg px-3.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === "save" ? "保存中" : "保存"}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!configured || busy !== null}
              onClick={() => void handleTest()}
              className="ghost-button focus-ring flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[10px] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy === "test" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Wifi size={11} />
              )}
              测试连接
            </button>
            {configured && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void handleClear()}
                className="focus-ring flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[10px] text-[#a0503f] transition-colors hover:bg-[#B85C4A]/10 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy === "clear" ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Trash2 size={11} />
                )}
                移除密钥
              </button>
            )}
            <span className="ml-auto text-[9px] text-muted/50">
              {model}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-canvas/55 px-2.5 py-2 text-[9.5px] leading-4 text-muted/65">
          <ShieldCheck size={12} className="mt-0.5 shrink-0 text-pin/80" />
          <span>
            密钥保存在 Windows 凭据管理器，不会写入数据库或前端代码。只有你点击
            AI 按钮时，当前记录的文字才会发送给 DeepSeek。
          </span>
        </div>
      </div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-accent" : "bg-ink/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
          checked ? "left-[18px]" : "left-0.5",
        )}
      />
    </button>
  );
}
