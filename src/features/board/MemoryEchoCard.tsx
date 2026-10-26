import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, X } from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { api } from "../../services/api";
import { useUiStore } from "../../stores/uiStore";
import type { MemoryEcho } from "../../types";

export function MemoryEchoCard() {
  const filter = useUiStore((state) => state.filter);
  const query = useUiStore((state) => state.query);
  const dateFilter = useUiStore((state) => state.dateFilter);
  const openNote = useUiStore((state) => state.openNote);
  const reduced = useReducedMotion();

  const [echo, setEcho] = useState<MemoryEcho | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    void api
      .getMemoryEcho()
      .then((value) => {
        if (alive) setEcho(value);
      })
      .catch(() => {
        // The echo is optional; a failure should never interrupt the board.
      });
    return () => {
      alive = false;
    };
  }, []);

  const visible =
    !dismissed &&
    echo &&
    filter === "all" &&
    !query.trim() &&
    !dateFilter;

  const excerpt =
    echo?.note.blocks
      .find((block) => block.blockType !== "image" && block.content.trim())
      ?.content.trim() ?? "";

  return (
    <AnimatePresence>
      {visible && echo && (
        <motion.div
          key="memory-echo"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="pointer-events-none absolute inset-x-0 bottom-[76px] z-20 flex justify-center px-6"
        >
          <div className="echo-card pointer-events-auto flex w-full max-w-[560px] items-center gap-3 rounded-2xl border border-accent/20 px-4 py-3 shadow-paper">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent-deep">
              <BookOpen size={15} strokeWidth={1.7} />
            </span>

            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                openNote(echo.note.id);
              }}
              className="focus-ring min-w-0 flex-1 rounded-lg py-0.5 text-left"
            >
              <span className="block text-[9px] font-medium uppercase tracking-[0.16em] text-accent-deep/75">
                Memory Echo
              </span>
              <span className="mt-1 block truncate text-[12.5px] tracking-[0.01em] text-ink/85">
                {echo.daysAgo > 0 ? `${echo.daysAgo} 天前` : "今天"}，你留下过这个想法。
              </span>
              {excerpt && (
                <span className="mt-0.5 block truncate text-[10.5px] text-muted/65">
                  {echo.note.title || excerpt}
                </span>
              )}
            </button>

            <IconButton
              label="收起 Memory Echo"
              size="sm"
              onClick={() => setDismissed(true)}
            >
              <X size={13} />
            </IconButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
