import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  CornerDownLeft,
  ImagePlus,
  Loader2,
  X,
} from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { LogoMark } from "../../components/LogoMark";
import { MagneticPin } from "../../components/MagneticPin";
import { assetSrc } from "../../lib/assets";
import { handleWindowDrag } from "../../lib/drag";
import { cn, errorMessage } from "../../lib/utils";
import { api } from "../../services/api";
import {
  imageBlobToPng,
  readClipboardImage,
} from "../../services/clipboard";
import {
  emitNotesChanged,
  hideCapture,
  onCaptureShown,
  onImageDrop,
  resizeCaptureWindow,
} from "../../services/system";
import type {
  CaptureDraft,
  CaptureMode,
  NewBlockInput,
  PendingImage,
} from "../../types";

const DRAFT_KEY = "elegemory.capture.draft.v1";

function emptyDraft(): CaptureDraft {
  return { text: "", mode: "note", image: null };
}

function readDraft(): CaptureDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return emptyDraft();
    const parsed = JSON.parse(raw) as Partial<CaptureDraft>;
    if (typeof parsed.text !== "string") return emptyDraft();
    const image =
      parsed.image &&
      typeof parsed.image.assetId === "string" &&
      typeof parsed.image.assetPath === "string"
        ? (parsed.image as PendingImage)
        : null;
    return {
      text: parsed.text,
      mode: parsed.mode === "todo" ? "todo" : "note",
      image,
    };
  } catch {
    return emptyDraft();
  }
}

export function CaptureWindow() {
  const [draft, setDraft] = useState<CaptureDraft>(readDraft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachingRef = useRef(false);
  const savingRef = useRef(false);

  const { text, mode, image } = draft;
  const canSave = Boolean(image) || Boolean(text.trim());

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // the draft is also kept in memory; storage quota is not critical here
    }
  }, [draft]);

  useEffect(() => {
    void resizeCaptureWindow(Boolean(image));
  }, [image]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const focus = () => {
      requestAnimationFrame(() => textareaRef.current?.focus());
    };

    focus();
    void onCaptureShown(focus).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.isComposing) {
        event.preventDefault();
        void hideCapture();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void onImageDrop((paths) => {
      const path = paths.find((item) => /\.(png|jpe?g|webp)$/i.test(item));
      if (!path) {
        setError("请拖入 PNG / JPEG / WebP 图片");
        return;
      }
      void attachPath(path);
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  function applyImage(asset: {
    id: string;
    path: string;
    width: number;
    height: number;
    mimeType: string;
    sizeBytes: number;
  }) {
    setDraft((previous) => ({
      ...previous,
      image: {
        assetId: asset.id,
        assetPath: asset.path,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
    }));
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function attachFile(file: File) {
    if (attachingRef.current) return;
    if (!file.type.startsWith("image/")) {
      setError("只能粘贴 PNG / JPEG 等图片文件");
      return;
    }
    attachingRef.current = true;
    setAttaching(true);
    setError(null);
    try {
      const encoded = await imageBlobToPng(file);
      const asset = await api.saveImageAsset(encoded.base64);
      applyImage(asset);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      attachingRef.current = false;
      setAttaching(false);
    }
  }

  async function attachPath(path: string) {
    if (attachingRef.current) return;
    attachingRef.current = true;
    setAttaching(true);
    setError(null);
    try {
      const asset = await api.importImagePath(path);
      applyImage(asset);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      attachingRef.current = false;
      setAttaching(false);
    }
  }

  async function pasteImageFromClipboard() {
    if (attachingRef.current) return;
    attachingRef.current = true;
    setAttaching(true);
    setError(null);
    try {
      const encoded = await readClipboardImage();
      if (!encoded) {
        setError("剪贴板里没有图片。可以直接 Ctrl + V 粘贴文字，或先截图再试。");
        return;
      }
      const asset = await api.saveImageAsset(encoded.base64);
      applyImage(asset);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      attachingRef.current = false;
      setAttaching(false);
    }
  }

  async function handleSave() {
    if (savingRef.current || saved || !canSave) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      const blocks: NewBlockInput[] = [];

      if (image) {
        blocks.push({ blockType: "image", assetId: image.assetId });
      }

      if (mode === "todo") {
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        lines.forEach((line) => {
          blocks.push({ blockType: "todo", content: line, isCompleted: false });
        });
      } else if (text.trim()) {
        blocks.push({ blockType: "text", content: text.trimEnd() });
      }

      if (!blocks.length) {
        setSaving(false);
        savingRef.current = false;
        return;
      }

      await api.createNote({ blocks });
      setSaved(true);
      void emitNotesChanged().catch(() => undefined);

      window.setTimeout(() => {
        setDraft(emptyDraft());
        setSaved(false);
        setSaving(false);
        savingRef.current = false;
        void resizeCaptureWindow(false);
        void hideCapture();
      }, 380);
    } catch (cause) {
      setSaving(false);
      savingRef.current = false;
      setError(errorMessage(cause));
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );
    if (!imageItem) return;
    event.preventDefault();
    const file = imageItem.getAsFile();
    if (file) void attachFile(file);
  }

  function handleTextKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter") return;

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      void handleSave();
      return;
    }

    if (mode === "note" && !event.shiftKey) {
      event.preventDefault();
      void handleSave();
    }
  }

  function setMode(nextMode: CaptureMode) {
    setDraft((previous) => ({ ...previous, mode: nextMode }));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <div
      className="flex h-full w-full items-stretch bg-transparent p-2"
      onPaste={handlePaste}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        if (file) void attachFile(file);
      }}
    >
      <div className="capture-shell surface-grain relative flex min-h-0 w-full flex-col overflow-hidden rounded-[20px] border border-ink/10">
        <header
          onMouseDown={handleWindowDrag}
          className="relative z-10 flex h-11 shrink-0 select-none items-center justify-between px-4 pt-0.5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark className="size-5" />
            <span className="font-serif text-[13px] tracking-[0.08em] text-ink/85">
              Elegemory
            </span>
            <span className="hidden text-[9px] tracking-[0.12em] text-muted/45 sm:inline">
              收起后草稿仍在
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-lg bg-ink/[0.045] p-0.5">
              {(
                [
                  ["note", "笔记"],
                  ["todo", "待办"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={cn(
                    "focus-ring rounded-[6px] px-2.5 py-1 text-[10.5px] transition-all duration-200",
                    mode === key
                      ? "bg-photo text-ink shadow-sm"
                      : "text-muted/75 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <IconButton
              label="收起到托盘"
              size="sm"
              onClick={() => void hideCapture()}
            >
              <X size={14} />
            </IconButton>
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-1">
          {image && (
            <div className="relative mt-0.5 shrink-0 rounded-xl border border-line/70 bg-photo p-1.5 shadow-[0_8px_18px_-12px_rgba(64,56,47,0.4)]">
              <MagneticPin
                key={image.assetId}
                className="absolute left-1/2 top-[-10px] z-10 -translate-x-1/2"
                delay={0.08}
              />
              <img
                src={assetSrc(image.assetPath)}
                alt="待保存的图片"
                draggable={false}
                className="max-h-[200px] w-full rounded-lg bg-canvas-deep/40 object-contain"
              />
              <div className="flex items-center justify-between px-1.5 pb-0.5 pt-1.5">
                <span className="text-[9.5px] tracking-[0.04em] text-muted/60">
                  {image.width} × {image.height} · {image.mimeType.split("/")[1]?.toUpperCase() ?? "PNG"}
                </span>
                <button
                  type="button"
                  onClick={() => setDraft((previous) => ({ ...previous, image: null }))}
                  className="focus-ring flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] text-muted/65 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <X size={9} />
                  移除
                </button>
              </div>
            </div>
          )}

          <div className="relative flex min-h-0 flex-1 flex-col">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => {
                setDraft((previous) => ({ ...previous, text: event.target.value }));
                if (error) setError(null);
              }}
              onKeyDown={handleTextKeyDown}
              readOnly={saved}
              spellCheck={false}
              placeholder={
                image
                  ? "给这张图加一句说明…"
                  : mode === "todo"
                    ? "每行写一件事，Ctrl + Enter 收好"
                    : "随手记下点什么…"
              }
              className={cn(
                "textarea-quiet w-full flex-1 px-1 text-[14px] leading-7 text-ink placeholder:text-muted/40",
                image ? "mt-2 min-h-[62px]" : "min-h-[88px]",
              )}
            />

            {mode === "todo" && (
              <span className="pointer-events-none absolute bottom-1 right-1.5 text-[9px] tracking-[0.04em] text-muted/45">
                一行一条待办
              </span>
            )}
          </div>

          {error && (
            <div className="mb-1 flex items-start gap-1.5 rounded-lg bg-[#C96F5F]/10 px-2.5 py-1.5 text-[10.5px] leading-4 text-[#a0503f]">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <footer className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-t border-ink/[0.07] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              disabled={attaching}
              onClick={() => void pasteImageFromClipboard()}
              className="ghost-button focus-ring flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[10.5px] disabled:opacity-60"
            >
              {attaching ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ImagePlus size={12} />
              )}
              {attaching ? "读取中" : "粘贴图片"}
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 text-[9.5px] text-muted/55 min-[430px]:flex">
              {mode === "todo" ? "Ctrl + Enter 收好" : "Enter 收好"} · Esc 收起
            </span>
            <button
              type="button"
              disabled={!canSave || saving}
              onClick={() => void handleSave()}
              className="primary-button focus-ring flex h-8 min-w-[74px] items-center justify-center gap-1.5 rounded-lg px-3 text-[11.5px] font-medium"
            >
              {saved ? (
                <>
                  <Check size={13} strokeWidth={2.6} />
                  已收好
                </>
              ) : saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  保存中
                </>
              ) : (
                <>
                  <CornerDownLeft size={12} />
                  收好
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
