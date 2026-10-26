import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toPng } from "html-to-image";
import { Download, Image as ImageIcon, Loader2, X } from "lucide-react";
import { IconButton } from "../../components/IconButton";
import {
  errorMessage,
  formatClock,
  formatDateKeyLabel,
  localDateKey,
} from "../../lib/utils";
import { api } from "../../services/api";
import { useNotesStore } from "../../stores/notesStore";
import { useUiStore } from "../../stores/uiStore";
import type { Note } from "../../types";

export function DayCanvas() {
  const dateKey = useUiStore((state) => state.dayCanvasDate);
  const close = useUiStore((state) => state.closeDayCanvas);
  const pushToast = useUiStore((state) => state.pushToast);
  const notes = useNotesStore((state) => state.notes);

  const posterRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [exporting, setExporting] = useState(false);

  const dayNotes = useMemo(
    () =>
      dateKey
        ? notes
            .filter(
              (note) =>
                !note.isArchived &&
                localDateKey(note.createdAt) === dateKey,
            )
            .sort((left, right) => left.createdAt - right.createdAt)
        : [],
    [notes, dateKey],
  );

  const imageAssetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const note of dayNotes) {
      for (const block of note.blocks) {
        if (block.blockType === "image" && block.asset) ids.add(block.asset.id);
      }
    }
    return Array.from(ids);
  }, [dayNotes]);

  useEffect(() => {
    if (!dateKey) return;
    let alive = true;
    setImages({});
    setLoadingImages(imageAssetIds.length > 0);

    void Promise.all(
      imageAssetIds.map(async (assetId) => {
        try {
          return [assetId, await api.getAssetDataUrl(assetId)] as const;
        } catch {
          return [assetId, ""] as const;
        }
      }),
    ).then((entries) => {
      if (!alive) return;
      setImages(Object.fromEntries(entries));
      setLoadingImages(false);
    });

    return () => {
      alive = false;
    };
  }, [dateKey, imageAssetIds]);

  const isToday = dateKey === localDateKey(Date.now());
  const dateLabel = dateKey ? formatDateKeyLabel(dateKey) : "";
  const imageCount = imageAssetIds.length;

  const exportPng = async () => {
    if (!posterRef.current || !dateKey || exporting) return;
    setExporting(true);
    try {
      const poster = posterRef.current;
      const dataUrl = await toPng(poster, {
        pixelRatio: 1.5,
        cacheBust: true,
        backgroundColor: getComputedStyle(poster).backgroundColor,
      });
      const saved = await api.savePngData(
        dataUrl,
        `Elegemory-Day-Canvas-${dateKey}.png`,
      );
      if (saved) pushToast("Day Canvas 已保存", "success");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {dateKey && (
        <motion.div
          key="day-canvas"
          className="fixed inset-0 z-[85] flex items-center justify-center p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="关闭 Day Canvas"
            className="absolute inset-0 bg-ink/22 backdrop-blur-[2px]"
            onClick={close}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Day Canvas"
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 330, damping: 32 }}
            className="relative flex max-h-[92vh] w-[940px] max-w-[96vw] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_36px_80px_-30px_rgba(64,56,47,0.55)]"
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line/70 px-5 py-3.5">
              <div>
                <h2 className="font-serif text-[18px] tracking-[0.02em] text-ink">
                  Day Canvas
                </h2>
                <p className="mt-0.5 text-[10px] text-muted/65">
                  {dateLabel} · {dayNotes.length} 个片段
                  {imageCount > 0 ? ` · ${imageCount} 张图片` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loadingImages || exporting || dayNotes.length === 0}
                  onClick={() => void exportPng()}
                  className="primary-button focus-ring flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium disabled:cursor-wait disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  {exporting
                    ? "导出中…"
                    : loadingImages
                      ? "准备图片…"
                      : "导出 PNG"}
                </button>
                <IconButton label="关闭" onClick={close}>
                  <X size={15} />
                </IconButton>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-canvas-deep/35 p-5">
              <div className="mx-auto w-full max-w-[860px]">
                <div ref={posterRef} className="day-canvas-poster">
                  <span className="day-canvas-pin" aria-hidden="true" />

                  <header className="day-canvas-header">
                    <div>
                      <p className="day-canvas-eyebrow">Day Canvas</p>
                      <h1 className="day-canvas-date">{dateLabel}</h1>
                      <p className="day-canvas-subtitle">
                        {isToday ? "今天" : "这一天"}留下了 {dayNotes.length} 个片段。
                      </p>
                    </div>
                    <div className="day-canvas-brand">
                      <span>Elegemory</span>
                      <span>{notes.length} memories kept</span>
                    </div>
                  </header>

                  <div className="day-canvas-rule" />

                  <div className="day-canvas-grid">
                    {dayNotes.map((note, index) => (
                      <CanvasFragment
                        key={note.id}
                        note={note}
                        index={index}
                        images={images}
                      />
                    ))}
                  </div>

                  <footer className="day-canvas-footer">
                    <span>记录不应当需要创建文档。</span>
                    <span>Elegemory · {dateLabel}</span>
                  </footer>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CanvasFragment({
  note,
  index,
  images,
}: {
  note: Note;
  index: number;
  images: Record<string, string>;
}) {
  const imageBlock = note.blocks.find(
    (block) => block.blockType === "image" && block.asset,
  );
  const textBlocks = note.blocks.filter(
    (block) => block.blockType === "text" && block.content.trim(),
  );
  const todoBlocks = note.blocks.filter(
    (block) => block.blockType === "todo" && block.content.trim(),
  );
  const text = textBlocks
    .map((block) => block.content.trim())
    .join("\n")
    .slice(0, 260);
  const imageSrc = imageBlock?.asset ? images[imageBlock.asset.id] : "";

  return (
    <article
      className={`day-canvas-fragment ${index % 3 === 1 ? "is-tilted" : ""}`}
    >
      {imageBlock && (
        <div className="day-canvas-image">
          {imageSrc ? (
            <img src={imageSrc} alt={imageBlock.asset?.relativePath ?? "记录图片"} />
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-muted/50">
              <ImageIcon size={12} />
              图片
            </span>
          )}
        </div>
      )}

      {text && <p className="day-canvas-text">{text}</p>}

      {todoBlocks.length > 0 && (
        <ul className="day-canvas-todos">
          {todoBlocks.slice(0, 5).map((block) => (
            <li
              key={block.id}
              className={block.isCompleted ? "is-done" : undefined}
            >
              <span aria-hidden="true">{block.isCompleted ? "✓" : "□"}</span>
              <span>{block.content.trim()}</span>
            </li>
          ))}
          {todoBlocks.length > 5 && (
            <li className="is-more">还有 {todoBlocks.length - 5} 条待办</li>
          )}
        </ul>
      )}

      <footer className="day-canvas-fragment-foot">
        <span>{formatClock(note.createdAt)}</span>
        <span>{note.isFavorite ? "收藏" : typeCaption(note)}</span>
      </footer>
    </article>
  );
}

function typeCaption(note: Note): string {
  if (note.type === "image" || note.type === "mixed") return "图片";
  if (note.type === "todo") return "待办";
  return "文字";
}
