import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { Image as ImageIcon, PinOff } from "lucide-react";
import { assetSrc } from "../../lib/assets";
import { errorMessage, formatFullDate, typeLabel } from "../../lib/utils";
import { api } from "../../services/api";
import { isTauri } from "../../services/env";
import { onPinNote } from "../../services/system";
import type { Note } from "../../types";

const PIN_MIN_WIDTH = 300;
const PIN_MAX_WIDTH = 560;
const PIN_MIN_HEIGHT = 320;
const PIN_MAX_HEIGHT = 900;
const PIN_SIZE_KEY = "elegemory.pin-window-size.v3";

export function PinnedNoteWindow() {
  const [noteId, setNoteId] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isTauri()) return;
    try {
      const raw = localStorage.getItem(PIN_SIZE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { width?: number; height?: number };
      const width = Math.min(
        PIN_MAX_WIDTH,
        Math.max(PIN_MIN_WIDTH, Number(parsed.width) || 360),
      );
      const height = Math.min(
        PIN_MAX_HEIGHT,
        Math.max(PIN_MIN_HEIGHT, Number(parsed.height) || 460),
      );
      void getCurrentWindow()
        .setSize(new LogicalSize(width, height))
        .catch(() => undefined);
    } catch {
      // Size preference is best-effort.
    }
  }, []);

  const startResize = (
    event: React.PointerEvent<HTMLDivElement>,
    axis: "x" | "y" | "xy",
  ) => {
    if (!isTauri() || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = window.innerWidth;
    const startHeight = window.innerHeight;
    element.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      const width =
        axis === "y"
          ? startWidth
          : Math.min(
              PIN_MAX_WIDTH,
              Math.max(
                PIN_MIN_WIDTH,
                startWidth + moveEvent.clientX - startX,
              ),
            );
      const height =
        axis === "x"
          ? startHeight
          : Math.min(
              PIN_MAX_HEIGHT,
              Math.max(
                PIN_MIN_HEIGHT,
                startHeight + moveEvent.clientY - startY,
              ),
            );
      void getCurrentWindow()
        .setSize(new LogicalSize(width, height))
        .catch(() => undefined);
    };

    const handleUp = (upEvent: PointerEvent) => {
      element.removeEventListener("pointermove", handleMove);
      element.removeEventListener("pointerup", handleUp);
      element.removeEventListener("pointercancel", handleUp);
      if (element.hasPointerCapture(upEvent.pointerId)) {
        element.releasePointerCapture(upEvent.pointerId);
      }
      try {
        localStorage.setItem(
          PIN_SIZE_KEY,
          JSON.stringify({
            width: window.innerWidth,
            height: window.innerHeight,
          }),
        );
      } catch {
        // Size preference is best-effort.
      }
    };

    element.addEventListener("pointermove", handleMove);
    element.addEventListener("pointerup", handleUp);
    element.addEventListener("pointercancel", handleUp);
  };

  const startMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!isTauri() || event.button !== 0) return;
    if (
      (event.target as HTMLElement).closest("button, input, textarea, a")
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget;
    const startScreenX = event.screenX;
    element.setPointerCapture(event.pointerId);

    let drag: {
      x: number;
      y: number;
      scale: number;
      left: number;
      right: number;
    } | null = null;

    void (async () => {
      try {
        const win = getCurrentWindow();
        const [position, size, scale, monitor] = await Promise.all([
          win.outerPosition(),
          win.outerSize(),
          win.scaleFactor(),
          currentMonitor(),
        ]);
        const left = monitor?.position.x ?? position.x;
        const right = Math.max(
          left,
          (monitor
            ? monitor.position.x + monitor.size.width
            : position.x + size.width) - size.width,
        );
        drag = { x: position.x, y: position.y, scale, left, right };
      } catch {
        // Moving the window is optional; ignore permission or monitor errors.
      }
    })();

    const handleMove = (moveEvent: PointerEvent) => {
      if (!drag) return;
      const x = Math.min(
        drag.right,
        Math.max(
          drag.left,
          drag.x + (moveEvent.screenX - startScreenX) * drag.scale,
        ),
      );
      void getCurrentWindow()
        .setPosition(new PhysicalPosition(Math.round(x), Math.round(drag.y)))
        .catch(() => undefined);
    };

    const handleUp = (upEvent: PointerEvent) => {
      element.removeEventListener("pointermove", handleMove);
      element.removeEventListener("pointerup", handleUp);
      element.removeEventListener("pointercancel", handleUp);
      if (element.hasPointerCapture(upEvent.pointerId)) {
        element.releasePointerCapture(upEvent.pointerId);
      }
    };

    element.addEventListener("pointermove", handleMove);
    element.addEventListener("pointerup", handleUp);
    element.addEventListener("pointercancel", handleUp);
  };

  useEffect(() => {
    let alive = true;
    void api.getPinnedNoteId().then((id) => {
      if (!alive || !id) return;
      setNoteId(id);
      setTick((value) => value + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let unlisten: (() => void) | undefined;
    void onPinNote((id) => {
      if (!alive) return;
      setNoteId(id);
      setError("");
      setTick((value) => value + 1);
    }).then((dispose) => {
      if (alive) unlisten = dispose;
      else dispose();
    });
    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!noteId) return;
    let alive = true;
    setError("");
    void api
      .getNote(noteId)
      .then((value) => {
        if (alive) setNote(value);
      })
      .catch((reason) => {
        if (alive) setError(errorMessage(reason));
      });
    return () => {
      alive = false;
    };
  }, [noteId]);

  const unpin = async () => {
    try {
      await api.unpinNote();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  };

  if (error) {
    return (
      <div className="flex h-full w-full justify-center">
        <div className="pin-card flex h-[calc(100vh-16px)] w-[calc(100vw-24px)] flex-col items-center justify-center gap-3 rounded-b-2xl border border-line px-6 text-center">
          <PinOff size={24} className="text-muted/40" />
          <p className="font-serif text-[17px] text-ink/75">这条记忆已经不在纸面上了</p>
          <p className="text-[10.5px] leading-5 text-muted/55">{error}</p>
          <button
            type="button"
            onClick={() => void unpin()}
            className="ghost-button focus-ring mt-1 flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px]"
          >
            <PinOff size={11} />
            取下
          </button>
        </div>
      </div>
    );
  }

  if (!note) {
    return <div className="h-full w-full" />;
  }

  return (
    <div className="relative flex h-full w-full justify-center">
      <motion.article
        key={`${note.id}-${tick}`}
        initial={{ y: 110, rotate: 2.4, opacity: 0 }}
        animate={{ y: 0, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 235, damping: 17, mass: 0.85 }}
        style={{ transformOrigin: "50% 0%" }}
        className="pin-card relative flex h-[calc(100vh-16px)] w-[calc(100vw-24px)] flex-col overflow-hidden rounded-b-2xl border border-line"
      >
        <span aria-hidden="true" className="pin-clip" />

        <header
          onPointerDown={startMove}
          className="flex shrink-0 cursor-grab touch-none select-none items-start justify-between gap-3 px-5 pb-3 pt-7 active:cursor-grabbing"
        >
          <div className="min-w-0">
            <p className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-accent-deep/70">
              Pinned Memory
            </p>
            <p className="mt-1 text-[9.5px] tracking-[0.02em] text-muted/60">
              {formatFullDate(note.createdAt)} · {typeLabel(note)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void unpin()}
            className="ghost-button focus-ring flex h-7 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[10px]"
          >
            <PinOff size={11} />
            取下
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <h1 className="font-serif text-[22px] leading-snug text-ink/90">
            {note.title || "无标题速记"}
          </h1>

          <div className="mt-4 space-y-2.5">
            {note.blocks.map((block) => {
              if (block.blockType === "image") {
                return block.asset ? (
                  <div
                    key={block.id}
                    className="overflow-hidden rounded-xl border border-line/60 bg-photo p-1.5"
                  >
                    <img
                      src={assetSrc(block.asset.path)}
                      alt={block.asset.relativePath || "记录图片"}
                      draggable={false}
                      className="max-h-[220px] w-full rounded-lg object-contain"
                    />
                  </div>
                ) : (
                  <div
                    key={block.id}
                    className="flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-4 text-[10px] text-muted/50"
                  >
                    <ImageIcon size={12} />
                    图片资源缺失
                  </div>
                );
              }

              if (block.blockType === "todo") {
                return (
                  <div
                    key={block.id}
                    className="flex items-start gap-2 rounded-lg border border-line/50 bg-photo/40 px-3 py-2"
                  >
                    <span
                      className={`mt-[3px] flex size-[13px] shrink-0 items-center justify-center rounded-[4px] border text-[9px] ${
                        block.isCompleted
                          ? "border-pin bg-pin text-white"
                          : "border-ink/20 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span
                      className={`whitespace-pre-wrap text-[12px] leading-5 ${
                        block.isCompleted
                          ? "text-muted/55 line-through"
                          : "text-ink/80"
                      }`}
                    >
                      {block.content || "（空白待办）"}
                    </span>
                  </div>
                );
              }

              return (
                <p
                  key={block.id}
                  className="whitespace-pre-wrap break-words text-[12.5px] leading-6 text-ink/80"
                >
                  {block.content || "（空白文字）"}
                </p>
              );
            })}
          </div>
        </div>

        <div
          aria-hidden="true"
          onPointerDown={(event) => startResize(event, "x")}
          className="absolute bottom-3 right-0 top-16 z-20 w-1.5 cursor-ew-resize touch-none"
        >
          <span className="absolute left-1/2 top-1/2 h-9 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/10 transition-colors hover:bg-accent/45" />
        </div>
        <div
          aria-hidden="true"
          onPointerDown={(event) => startResize(event, "y")}
          className="absolute inset-x-3 bottom-0 z-20 h-1.5 cursor-ns-resize touch-none"
        >
          <span className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/10 transition-colors hover:bg-accent/45" />
        </div>
        <div
          aria-hidden="true"
          onPointerDown={(event) => startResize(event, "xy")}
          className="absolute bottom-0 right-0 z-30 size-4 cursor-nwse-resize touch-none"
        >
          <span className="absolute bottom-1 right-1 size-2 rounded-br-[2px] border-b border-r border-ink/15 transition-colors hover:border-accent/50" />
        </div>
      </motion.article>
    </div>
  );
}
