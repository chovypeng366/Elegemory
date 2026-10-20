import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  WHISPER_SETTING_KEYS,
  parseWhisperSettings,
  type TenthMode,
} from "../../lib/whisperEngine";
import { useSettingsStore } from "../../stores/settingsStore";

export function WhisperSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const config = parseWhisperSettings(settings);

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted/65">
        <Sparkles size={14} />
        记忆低语
      </div>
      <div className="space-y-3.5 rounded-xl border border-line/70 bg-photo/45 p-3.5">
        <SettingRow
          label="开启记忆低语"
          description="新增记录后，在白板底部出现一句短句。"
        >
          <Toggle
            label="开启记忆低语"
            checked={config.enabled}
            onChange={(value) =>
              void updateSetting(
                WHISPER_SETTING_KEYS.enabled,
                value ? "1" : "0",
              )
            }
          />
        </SettingRow>

        <div>
          <RowLabel>语气偏好</RowLabel>
          <Segmented
            label="语气偏好"
            value={config.tone}
            options={[
              { value: "gentle", label: "温柔" },
              { value: "playful", label: "俏皮" },
              { value: "mixed", label: "混合" },
            ]}
            onChange={(value) =>
              void updateSetting(WHISPER_SETTING_KEYS.tone, value)
            }
          />
        </div>

        <Divider />
        <SettingRow
          label="深夜关怀"
          description="凌晨 1:00–4:59 优先显示休息提醒。"
        >
          <Toggle
            label="深夜关怀"
            checked={config.lateNight}
            onChange={(value) =>
              void updateSetting(
                WHISPER_SETTING_KEYS.lateNight,
                value ? "1" : "0",
              )
            }
          />
        </SettingRow>

        <SettingRow
          label="季节与节日文案"
          description="偶尔出现与当前季节相合的句子。"
        >
          <Toggle
            label="季节与节日文案"
            checked={config.seasonal}
            onChange={(value) =>
              void updateSetting(
                WHISPER_SETTING_KEYS.seasonal,
                value ? "1" : "0",
              )
            }
          />
        </SettingRow>

        <div>
          <RowLabel>第 10 条彩蛋</RowLabel>
          <Segmented
            label="第 10 条彩蛋策略"
            value={config.tenthMode}
            options={[
              { value: "random_after_first", label: "之后随机" },
              { value: "always_original", label: "固定原句" },
            ]}
            onChange={(value: TenthMode) =>
              void updateSetting(WHISPER_SETTING_KEYS.tenthMode, value)
            }
          />
          <p className="mt-1.5 text-[9.5px] leading-4 text-muted/60">
            第一次达成第 10 条时始终显示「这里是地狱吗」。
          </p>
        </div>

        <SettingRow
          label="增强动效"
          description="文案出现时带轻微位移和缩放。"
        >
          <Toggle
            label="增强动效"
            checked={config.enhancedMotion}
            onChange={(value) =>
              void updateSetting(
                WHISPER_SETTING_KEYS.enhancedMotion,
                value ? "1" : "0",
              )
            }
          />
        </SettingRow>
      </div>
    </section>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] text-ink/85">{label}</p>
        <p className="mt-0.5 text-[9.5px] leading-4 text-muted/60">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function RowLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[10.5px] text-ink/80">{children}</p>
  );
}

function Divider() {
  return <div className="h-px bg-line/60" />;
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

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-lg bg-ink/[0.045] p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "focus-ring flex-1 rounded-[6px] px-2 py-1.5 text-[10.5px] transition-all",
            value === option.value
              ? "bg-photo text-ink shadow-sm"
              : "text-muted hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
