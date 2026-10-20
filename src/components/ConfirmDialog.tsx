import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useUiStore } from "../stores/uiStore";

export function ConfirmDialog() {
  const pending = useUiStore((state) => state.pendingConfirm);
  const resolveConfirm = useUiStore((state) => state.resolveConfirm);

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        resolveConfirm(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, resolveConfirm]);

  const options = pending?.options;

  return (
    <AnimatePresence>
      {pending && options && (
        <motion.div
          key="confirm"
          className="fixed inset-0 z-[130] flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="取消"
            className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
            onClick={() => resolveConfirm(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={options.title}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="relative w-[380px] max-w-full overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-[0_30px_60px_-24px_rgba(64,56,47,0.5)]"
          >
            <h3 className="font-serif text-[18px] text-ink">{options.title}</h3>
            {options.description && (
              <p className="mt-2 text-[12px] leading-6 text-muted">{options.description}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="ghost-button focus-ring h-9 rounded-lg px-4 text-[12px]"
              >
                {options.cancelLabel ?? "取消"}
              </button>
              <button
                type="button"
                onClick={() => resolveConfirm(true)}
                className={
                  options.tone === "danger"
                    ? "focus-ring h-9 rounded-lg bg-[#B85C4A] px-4 text-[12px] font-medium text-[#FFF8F2] shadow-sm transition-colors hover:bg-[#a7503f]"
                    : "primary-button focus-ring h-9 rounded-lg px-4 text-[12px] font-medium"
                }
              >
                {options.confirmLabel ?? "确定"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
