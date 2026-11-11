import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { Image as ImageIcon, PinOff } from "lucide-react";
import { assetSrc } from "../../lib/assets";
import { errorMessage, formatFullDate, typeLabel } from "../../lib/utils";
import { api } from "../../services/api";
import { isTauri } from "../../services/env";
import type { Note } from "../../types";

const MIN_WIDTH = 232;
const MAX_WIDTH = 620;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 900;
const SIZE_KEY = "elegemory.pin-card-size.v2";
const LINE_BASE_Y = 24;
const LINE_SAG = 16;

type ResizeAxis = "x" | "y" | "xy";

function pinnedNoteId(): string {
  if (isTauri()) {
    const label = getCurrentWindow().label;
    if (label.startsWith("pin-")) return label.slice(4);
  }
  return new URLSearchParams(window.location.search).get("noteId") ?? "";
}

export function PinnedLineWindow() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Clothesline />
      <LineFlowers />
    </div>
  );
}

export function PinnedCardWindow() {
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [sway, setSway] = useState(0);
  const reduced = useReducedMotion();
  const ignoreClickRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let id = pinnedNoteId();
        if (!id) {
          const notes = await api.listNotes();
          id = notes[0]?.id ?? "";
        }
        if (!id) throw new Error("找不到这条记忆");
        const value = await api.getNote(id);
        if (!cancelled) {
          setNote(value);
          setError("");
        }
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { width?: number; height?: number };
      const width = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, Number(parsed.width) || 252),
      );
      const height = Math.min(
        MAX_HEIGHT,
        Math.max(MIN_HEIGHT, Number(parsed.height) || 380),
      );
      void getCurrentWindow()
        .setSize(new LogicalSize(width, height))
        .catch(() => undefined);
    } catch {
      // Size preference is best-effort.
    }
  }, []);

  useEffect(() => {
    if (reduced) {
      setSway(0);
      return;
    }
    let cancelled = false;
    let timer = 0;
    const breeze = () => {
      if (cancelled || document.hidden) return;
      const angle =
        (0.7 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1);
      setSway(angle);
      window.setTimeout(() => {
        if (!cancelled) setSway(0);
      }, 520);
      timer = window.setTimeout(breeze, 4500 + Math.random() * 4500);
    };
    timer = window.setTimeout(breeze, 3000 + Math.random() * 3500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reduced]);

  const startResize = (event: React.PointerEvent<HTMLDivElement>, axis: ResizeAxis) => {
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
              MAX_WIDTH,
              Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX),
            );
      const height =
        axis === "x"
          ? startHeight
          : Math.min(
              MAX_HEIGHT,
              Math.max(MIN_HEIGHT, startHeight + moveEvent.clientY - startY),
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
          SIZE_KEY,
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
    if ((event.target as HTMLElement).closest("button, input, textarea, a")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const element = event.currentTarget;
    const startScreenX = event.screenX;
    let moved = false;
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
      if (Math.abs(moveEvent.screenX - startScreenX) > 3) moved = true;
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
      if (moved) {
        ignoreClickRef.current = true;
        window.setTimeout(() => {
          ignoreClickRef.current = false;
        }, 250);
      }
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

  const takeDown = async () => {
    if (!note || leaving || ignoreClickRef.current) return;
    setLeaving(true);
    if (!reduced) {
      await new Promise((resolve) => window.setTimeout(resolve, 340));
    }
    try {
      await api.unpinNote(note.id);
    } catch (reason) {
      setLeaving(false);
      setError(errorMessage(reason));
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="flex h-full w-full flex-col items-center pt-2">
        <Clothespin />
        <motion.div
          animate={{ rotate: sway }}
          transition={{ type: "spring", stiffness: 34, damping: 3.2 }}
          style={{ transformOrigin: "50% 0%" }}
          className="relative flex w-[calc(100vw-32px)] flex-col items-center"
        >
          {note && (
            <motion.div
              initial={reduced ? false : { y: -24, rotate: 8, opacity: 0 }}
              animate={
                leaving
                  ? { y: 220, rotate: -6, opacity: 0 }
                  : { y: 0, rotate: 0, opacity: 1 }
              }
              whileHover={reduced || leaving ? undefined : { scale: 1.006 }}
              transition={
                leaving
                  ? { duration: 0.32, ease: "easeIn" }
                  : { type: "spring", stiffness: 55, damping: 8, mass: 0.8 }
              }
              style={{ transformOrigin: "50% 0%" }}
              className="relative w-full"
            >
              <article className="pin-card relative -mt-1 flex h-[calc(100vh-74px)] w-full flex-col overflow-hidden rounded-2xl border border-line">
                <header
                  onPointerDown={startMove}
                  className="flex shrink-0 cursor-grab touch-none select-none items-start justify-between gap-2 px-3.5 pb-2 pt-3.5 active:cursor-grabbing"
                >
                  <div className="min-w-0">
                    <p className="text-[7.5px] font-medium uppercase tracking-[0.18em] text-accent-deep/70">
                      Pinned
                    </p>
                    <p className="mt-0.5 truncate text-[8px] tracking-[0.01em] text-muted/60">
                      {formatFullDate(note.createdAt)} · {typeLabel(note)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void takeDown()}
                    className="ghost-button focus-ring flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[9px]"
                  >
                    <PinOff size={9} />
                    取下
                  </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-4">
                  <h1 className="font-serif text-[16px] leading-snug text-ink/90">
                    {note.title || "无标题速记"}
                  </h1>

                  <div className="mt-2 space-y-2">
                    {note.blocks.map((block) => {
                      if (block.blockType === "image") {
                        return block.asset ? (
                          <div
                            key={block.id}
                            className="overflow-hidden rounded-lg border border-line/60 bg-photo p-1"
                          >
                            <img
                              src={assetSrc(block.asset.path)}
                              alt={block.asset.relativePath || "记录图片"}
                              draggable={false}
                              className="max-h-[calc(100vh-160px)] w-full rounded-md object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            key={block.id}
                            className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-3 text-[9px] text-muted/50"
                          >
                            <ImageIcon size={11} />
                            图片缺失
                          </div>
                        );
                      }

                      if (block.blockType === "todo") {
                        return (
                          <div
                            key={block.id}
                            className="flex items-start gap-1.5 rounded-md border border-line/50 bg-photo/40 px-2 py-1.5"
                          >
                            <span
                              className={`mt-[2px] flex size-[11px] shrink-0 items-center justify-center rounded-[3px] border text-[8px] ${
                                block.isCompleted
                                  ? "border-pin bg-pin text-white"
                                  : "border-ink/20 text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`whitespace-pre-wrap text-[10px] leading-4 ${
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
                          className="whitespace-pre-wrap break-words text-[10.5px] leading-[1.7] text-ink/80"
                        >
                          {block.content || "（空白文字）"}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </article>

              <Flower
                size={11}
                tone="pin"
                className="pointer-events-none absolute -left-2.5 top-8 z-20 -rotate-[18deg]"
              />
              <Flower
                size={8}
                tone="accent"
                className="pointer-events-none absolute -right-2 top-20 z-20 rotate-[22deg]"
              />
              <Flower
                size={9}
                tone="accent"
                className="pointer-events-none absolute -right-1.5 bottom-9 z-20 rotate-[30deg]"
              />

              <div
                aria-hidden="true"
                onPointerDown={(event) => startResize(event, "x")}
                className="absolute -right-1.5 bottom-0 top-0 z-40 w-3 cursor-ew-resize touch-none"
              >
                <span className="absolute right-1.5 top-1/2 h-10 w-[2px] -translate-y-1/2 rounded-full bg-ink/20 transition-colors hover:bg-accent/60" />
              </div>
              <div
                aria-hidden="true"
                onPointerDown={(event) => startResize(event, "y")}
                className="absolute inset-x-0 -bottom-1.5 z-40 h-3 cursor-ns-resize touch-none"
              >
                <span className="absolute bottom-1.5 left-1/2 h-[2px] w-10 -translate-x-1/2 rounded-full bg-ink/20 transition-colors hover:bg-accent/60" />
              </div>
              <div
                aria-hidden="true"
                onPointerDown={(event) => startResize(event, "xy")}
                className="absolute -bottom-1.5 -right-1.5 z-50 size-5 cursor-nwse-resize touch-none"
              >
                <span className="absolute bottom-2 right-2 size-3 rounded-br-[2px] border-b border-r border-ink/30 transition-colors hover:border-accent/70" />
                <span className="absolute bottom-[13px] right-2 size-1.5 rounded-br-[2px] border-b border-r border-ink/20 transition-colors hover:border-accent/70" />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {!note && !error && (
        <div className="flex h-full items-center justify-center text-[10px] text-muted/60">
          正在挂起这页记忆…
        </div>
      )}

      {error && (
        <div className="absolute inset-x-4 bottom-3 z-40 rounded-xl border border-[#B85C4A]/20 bg-[#fff6f2]/95 px-3 py-2 text-center text-[10px] leading-4 text-[#a0503f] shadow-paper">
          {error}
        </div>
      )}
    </div>
  );
}

function Clothesline() {
  const controlY = LINE_BASE_Y + LINE_SAG * 2;
  const path = `M0 ${LINE_BASE_Y} Q50 ${controlY} 100 ${LINE_BASE_Y}`;
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      viewBox="0 0 100 48"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="pin-line-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6f5d49" stopOpacity="0" />
          <stop offset="0.06" stopColor="#6f5d49" stopOpacity="0.6" />
          <stop offset="0.94" stopColor="#6f5d49" stopOpacity="0.6" />
          <stop offset="1" stopColor="#6f5d49" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="rgba(111,93,73,0.16)"
        strokeWidth="3.4"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        transform="translate(0 0.8)"
      />
      <path
        d={path}
        fill="none"
        stroke="url(#pin-line-fade)"
        strokeWidth="1.4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function LineFlowers() {
  const flowers = [
    { left: 4, size: 8, rotate: -18, tone: "accent", drift: -1 },
    { left: 13, size: 7, rotate: 26, tone: "pin", drift: 2 },
    { left: 24, size: 9, rotate: -8, tone: "accent", drift: -2 },
    { left: 35, size: 6, rotate: 18, tone: "pin", drift: 1 },
    { left: 47, size: 10, rotate: -24, tone: "accent", drift: -1 },
    { left: 58, size: 7, rotate: 32, tone: "pin", drift: 2 },
    { left: 69, size: 9, rotate: -14, tone: "accent", drift: -2 },
    { left: 80, size: 6, rotate: 22, tone: "pin", drift: 1 },
    { left: 90, size: 8, rotate: -28, tone: "accent", drift: -1 },
    { left: 96, size: 7, rotate: 16, tone: "pin", drift: 2 },
  ] as const;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    >
      {flowers.map((flower) => {
        const t = flower.left / 100;
        const lineY = LINE_BASE_Y + LINE_SAG * 4 * t * (1 - t);
        return (
          <Flower
            key={flower.left}
            size={flower.size}
            tone={flower.tone}
            className="absolute opacity-70"
            style={{
              left: `${flower.left}%`,
              top: lineY - flower.size / 2 + flower.drift,
              transform: `rotate(${flower.rotate}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

function Flower({
  size = 8,
  tone = "accent",
  className,
  style,
}: {
  size?: number;
  tone?: "accent" | "pin";
  className?: string;
  style?: React.CSSProperties;
}) {
  const color = tone === "pin" ? "var(--color-pin)" : "var(--color-accent)";
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className={className}
      style={style}
    >
      <path
        d="M10 13 q-3.5 1.2 -4.5 4.8 q3.8 -0.6 4.5 -4.8"
        fill="var(--color-accent-deep)"
        opacity="0.3"
      />
      <path
        d="M11 13.5 q3.4 1.4 4 4.5 q-3.4 -0.7 -4 -4.5"
        fill="var(--color-accent-deep)"
        opacity="0.22"
      />
      <g fill={color} opacity="0.68">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse
            key={angle}
            cx="10"
            cy="5.2"
            rx="2.5"
            ry="3.4"
            transform={`rotate(${angle} 10 10)`}
          />
        ))}
      </g>
      <circle cx="10" cy="10" r="2.1" fill="var(--color-surface)" opacity="0.95" />
      <circle cx="10" cy="10" r="1.2" fill={color} opacity="0.9" />
    </svg>
  );
}

function Clothespin() {
  return (
    <svg
      aria-hidden="true"
      width="44"
      height="36"
      viewBox="0 0 48 38"
      className="relative z-10 -mb-0.5 drop-shadow-[0_2px_2px_rgba(64,56,47,0.24)]"
    >
      <defs>
        <linearGradient id="pin-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#b78b63" />
          <stop offset="0.45" stopColor="#d9b58e" />
          <stop offset="1" stopColor="#9c734f" />
        </linearGradient>
      </defs>
      <g transform="rotate(-5 24 19)">
        <rect
          x="9"
          y="3"
          width="14"
          height="32"
          rx="6.5"
          fill="url(#pin-wood)"
          stroke="#846044"
          strokeWidth="0.8"
        />
        <rect
          x="25"
          y="3"
          width="14"
          height="32"
          rx="6.5"
          fill="url(#pin-wood)"
          stroke="#846044"
          strokeWidth="0.8"
        />
        <rect
          x="19"
          y="12"
          width="10"
          height="8"
          rx="2.5"
          fill="#b7c2bf"
          stroke="#7f8e8a"
          strokeWidth="0.9"
        />
        <path d="M20 15.5h8" stroke="#eef3f1" strokeWidth="0.8" opacity="0.65" />
      </g>
    </svg>
  );
}
