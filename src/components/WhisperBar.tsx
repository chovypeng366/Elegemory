import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Feather } from "lucide-react";
import { parseWhisperSettings } from "../lib/whisperEngine";
import { useSettingsStore } from "../stores/settingsStore";
import { useWhisperStore } from "../stores/whisperStore";

export function WhisperBar() {
  const current = useWhisperStore((state) => state.current);
  const settings = useSettingsStore((state) => state.settings);
  const reduced = useReducedMotion();
  const config = parseWhisperSettings(settings);
  const enhanced = config.enhancedMotion && !reduced;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center px-6"
    >
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.key}
            initial={enhanced ? { opacity: 0, y: 10, scale: 0.97 } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              ...(enhanced ? { y: 5 } : {}),
              transition: { duration: 0.25, ease: "easeIn" },
            }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="whisper-bar flex max-w-full items-center gap-2.5 rounded-full px-4 py-2.5"
          >
            <Feather size={13} strokeWidth={1.8} className="shrink-0 text-accent" />
            <span className="whitespace-nowrap text-[12px] tracking-[0.02em] text-ink/80">
              {current.phrase.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
