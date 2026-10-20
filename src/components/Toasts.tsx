import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "../lib/utils";
import { useUiStore } from "../stores/uiStore";

const toneStyles = {
  success: "border-pin/30 bg-[#F4F7F3]/95 text-ink",
  error: "border-[#C96F5F]/30 bg-[#FBF1ED]/95 text-[#7f4034]",
  info: "border-line bg-photo/95 text-ink",
} as const;

const toneIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

export function Toasts() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = toneIcons[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className={cn(
                "pointer-events-auto flex max-w-[440px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12px] shadow-[0_14px_30px_-16px_rgba(64,56,47,0.45)] backdrop-blur",
                toneStyles[toast.tone],
              )}
            >
              <Icon
                size={15}
                className={cn(
                  "shrink-0",
                  toast.tone === "success" && "text-pin",
                  toast.tone === "error" && "text-[#b85c4a]",
                  toast.tone === "info" && "text-accent",
                )}
              />
              <span className="leading-5">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast(toast.id);
                  }}
                  className="focus-ring ml-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-accent-deep transition-colors hover:bg-accent/10"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="关闭提示"
                onClick={() => dismissToast(toast.id)}
                className="icon-button ml-0.5 size-6 shrink-0"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
