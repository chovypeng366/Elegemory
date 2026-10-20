import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Archive,
  Check,
  Copy,
  ImageDown,
  ListTodo,
  Pin,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { assetSrc } from "../../lib/assets";
import {
  cn,
  errorMessage,
  firstImage,
  formatFullDate,
  notePlainText,
  typeLabel,
} from "../../lib/utils";
import { copyImageToClipboard, copyTextToClipboard } from "../../services/clipboard";
import { useNotesStore } from "../../stores/notesStore";
import { useUiStore } from "../../stores/uiStore";
import type { NoteBlock } from "../../types";

export function NoteDetailDrawer() {
  const selectedId = useUiStore((state) => state.selectedNoteId);
  const closeNote = useUiStore((state) => state.closeNote);
  const pushToast = useUiStore((state) => state.pushToast);
  const requestConfirm = useUiStore((state) => state.requestConfirm);

  const note = useNotesStore(
    (state) => state.notes.find((item) => item.id === selectedId) ?? null,
  );
  const updateTitle = useNotesStore((state) => state.updateTitle);
  const toggleFavorite = useNotesStore((state) => state.toggleFavorite);
  const togglePinned = useNotesStore((state) => state.togglePinned);
  const archiveNote = useNotesStore((state) => state.archiveNote);
  const restoreNote = useNotesStore((state) => state.restoreNote);
  const deleteNotePermanently = useNotesStore((state) => state.deleteNotePermanently);
  const addBlock = useNotesStore((state) => state.addBlock);
  const saveBlockContent = useNotesStore((state) => state.saveBlockContent);
  const removeBlock = useNotesStore((state) => state.removeBlock);
  const toggleTodo = useNotesStore((state) => state.toggleTodo);

  const [title, setTitle] = useState("");
  const syncedNoteId = useRef<string | null>(null);

  useEffect(() => {
    if (note && syncedNoteId.current !== note.id) {
      syncedNoteId.current = note.id;
      setTitle(note.title);
    }
    if (!note) syncedNoteId.current = null;
  }, [note]);

  const archived = note?.isArchived ?? false;
  const image = note ? firstImage(note) : null;

  const commitTitle = async () => {
    if (!note) return;
    const next = title.trim();
    if (next === note.title) return;
    await updateTitle(note.id, next);
  };

  const handleCopyText = async () => {
    if (!note) return;
    try {
      await copyTextToClipboard(notePlainText(note));
      pushToast("文字已复制到剪贴板", "success");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  };

  const handleCopyImage = async () => {
    if (!image) return;
    try {
      await copyImageToClipboard(image.path);
      pushToast("图片已复制到剪贴板", "success");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  };

  const handleArchive = async () => {
    if (!note) return;
    const updated = await archiveNote(note);
    if (updated) closeNote();
  };

  const handleDelete = async () => {
    if (!note) return;
    const confirmed = await requestConfirm({
      title: "永久删除这条记录？",
      description: "删除后无法恢复，记录中的图片也会从本机移除。",
      confirmLabel: "永久删除",
      tone: "danger",
    });
    if (!confirmed) return;
    const deleted = await deleteNotePermanently(note);
    if (deleted) closeNote();
  };

  const handleAddBlock = async (blockType: "text" | "todo") => {
    if (!note) return;
    await addBlock(note.id, { blockType, content: "" });
  };

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          key="detail-overlay"
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="关闭详情"
            onClick={closeNote}
            className="absolute inset-0 bg-ink/10 backdrop-blur-[1.5px]"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="记录详情"
            initial={{ x: 52, opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 52, opacity: 0 }}
            transition={{ type: "spring", stiffness: 330, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
            className="drawer-surface absolute right-0 top-0 flex h-full w-[468px] max-w-[94vw] flex-col border-l border-line shadow-[-30px_0_60px_-30px_rgba(64,56,47,0.35)]"
          >
            <header className="flex shrink-0 items-start justify-between px-6 pb-3 pt-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[9.5px] font-medium uppercase tracking-[0.2em] text-muted/60">
                  <span>记录详情</span>
                  {archived && (
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[9px] tracking-[0.08em] text-muted">
                      回收站
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[10.5px] tracking-[0.02em] text-muted/75">
                  {formatFullDate(note.createdAt)} · {typeLabel(note)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                {!archived && (
                  <>
                    <IconButton label="复制文字" onClick={() => void handleCopyText()}>
                      <Copy size={14} />
                    </IconButton>
                    {image && (
                      <IconButton label="复制图片" onClick={() => void handleCopyImage()}>
                        <ImageDown size={14} />
                      </IconButton>
                    )}
                    <IconButton
                      label={note.isFavorite ? "取消收藏" : "收藏"}
                      active={note.isFavorite}
                      onClick={() => void toggleFavorite(note)}
                    >
                      <Star
                        size={14}
                        className={cn(note.isFavorite && "fill-accent text-accent")}
                      />
                    </IconButton>
                    <IconButton
                      label={note.isPinned ? "取消置顶" : "置顶"}
                      active={note.isPinned}
                      onClick={() => void togglePinned(note)}
                    >
                      <Pin size={14} className={cn(note.isPinned && "text-pin")} />
                    </IconButton>
                    <IconButton
                      label="移入回收站"
                      onClick={() => void handleArchive()}
                    >
                      <Archive size={14} />
                    </IconButton>
                  </>
                )}
                <IconButton label="关闭" onClick={closeNote}>
                  <X size={15} />
                </IconButton>
              </div>
            </header>

            <div key={note.id} className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-1">
              {archived ? (
                <h2 className="font-serif text-[23px] leading-snug text-ink/90">
                  {note.title || "无标题速记"}
                </h2>
              ) : (
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  onBlur={() => void commitTitle()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="给这条记录一个标题"
                  spellCheck={false}
                  className="w-full bg-transparent font-serif text-[23px] leading-snug text-ink outline-none placeholder:text-muted/35"
                />
              )}

              <div className="mt-5 space-y-2.5">
                {note.blocks.map((block) =>
                  block.blockType === "image" ? (
                    <ImageBlock key={block.id} block={block} />
                  ) : (
                    <EditableBlock
                      key={block.id}
                      block={block}
                      archived={archived}
                      canDelete={note.blocks.length > 1}
                      onSave={saveBlockContent}
                      onDelete={removeBlock}
                      onToggle={toggleTodo}
                      pushToast={pushToast}
                    />
                  ),
                )}
              </div>

              {!archived && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleAddBlock("text")}
                    className="ghost-button focus-ring flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px]"
                  >
                    <Plus size={12} />
                    添加文字
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAddBlock("todo")}
                    className="ghost-button focus-ring flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px]"
                  >
                    <ListTodo size={12} />
                    添加待办
                  </button>
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-line/70 px-6 py-3">
              {archived ? (
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] text-muted/65">
                    恢复后可继续编辑
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void restoreNote(note)}
                      className="ghost-button focus-ring flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px]"
                    >
                      <RotateCcw size={12} />
                      恢复
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      className="focus-ring flex h-8 items-center gap-1.5 rounded-lg bg-[#B85C4A]/10 px-3 text-[11px] text-[#a0503f] transition-colors hover:bg-[#B85C4A]/16"
                    >
                      <Trash2 size={12} />
                      永久删除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] text-muted/60">
                    <Check size={11} className="text-pin/80" />
                    修改会自动保存
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleCopyText()}
                      className="ghost-button focus-ring flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px]"
                    >
                      <Copy size={11} />
                      复制文字
                    </button>
                    {image && (
                      <button
                        type="button"
                        onClick={() => void handleCopyImage()}
                        className="ghost-button focus-ring flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px]"
                      >
                        <ImageDown size={11} />
                        复制图片
                      </button>
                    )}
                  </div>
                </div>
              )}
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ImageBlock({ block }: { block: NoteBlock }) {
  const pushToast = useUiStore((state) => state.pushToast);

  if (!block.asset) {
    return (
      <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[11px] text-muted/60">
        图片资源缺失
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line/70 bg-photo p-2">
      <img
        src={assetSrc(block.asset.path)}
        alt={block.asset.relativePath || "记录图片"}
        draggable={false}
        className="max-h-[320px] w-full rounded-lg bg-canvas-deep/40 object-contain"
      />
      <div className="flex items-center justify-between px-1.5 pb-0.5 pt-2">
        <span className="text-[9.5px] tracking-[0.04em] text-muted/55">
          {block.asset.width} × {block.asset.height} · PNG
        </span>
        <button
          type="button"
          onClick={() => {
            copyImageToClipboard(block.asset?.path ?? "")
              .then(() => pushToast("图片已复制到剪贴板", "success"))
              .catch((error) => pushToast(errorMessage(error), "error"));
          }}
          className="focus-ring flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-accent-deep transition-colors hover:bg-accent/10"
        >
          <Copy size={10} />
          复制原图
        </button>
      </div>
    </div>
  );
}

interface EditableBlockProps {
  block: NoteBlock;
  archived: boolean;
  canDelete: boolean;
  onSave: (blockId: string, content: string) => Promise<unknown>;
  onDelete: (blockId: string) => Promise<unknown>;
  onToggle: (blockId: string) => Promise<unknown>;
  pushToast: (message: string, tone?: "success" | "error" | "info") => void;
}

function EditableBlock({
  block,
  archived,
  canDelete,
  onSave,
  onDelete,
  onToggle,
  pushToast,
}: EditableBlockProps) {
  const [value, setValue] = useState(block.content);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setValue(block.content);
  }, [block.content, focused]);

  const commit = () => {
    if (value !== block.content) {
      void onSave(block.id, value);
    }
  };

  const handleDelete = () => {
    if (!canDelete) {
      pushToast("至少保留一段内容，可直接删除整条记录", "info");
      return;
    }
    void onDelete(block.id);
  };

  if (archived) {
    return (
      <div className="rounded-xl border border-line/60 bg-photo/40 px-3.5 py-3">
        {block.blockType === "todo" ? (
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-[3px] flex size-[15px] shrink-0 items-center justify-center rounded-[5px] border",
                block.isCompleted
                  ? "border-pin/70 bg-pin/70 text-white"
                  : "border-ink/15 text-transparent",
              )}
            >
              <Check size={10} strokeWidth={3} />
            </span>
            <span
              className={cn(
                "whitespace-pre-wrap text-[13px] leading-6",
                block.isCompleted && "text-muted/60 line-through",
              )}
            >
              {block.content || "（空白待办）"}
            </span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.85] text-ink/80">
            {block.content || "（空白文字）"}
          </p>
        )}
      </div>
    );
  }

  if (block.blockType === "todo") {
    return (
      <div className="block-editor group/block rounded-xl px-3 py-2.5">
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            aria-label={block.isCompleted ? "标记为未完成" : "标记为完成"}
            onClick={() => void onToggle(block.id)}
            className={cn(
              "mt-[3px] flex size-[16px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-200",
              block.isCompleted
                ? "border-pin bg-pin text-white"
                : "border-ink/20 bg-white/55 text-transparent hover:border-pin/70 hover:bg-pin/5",
            )}
          >
            <motion.span
              initial={false}
              animate={{
                scale: block.isCompleted ? 1 : 0.4,
                opacity: block.isCompleted ? 1 : 0,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
            >
              <Check size={11} strokeWidth={3.2} />
            </motion.span>
          </button>

          <textarea
            value={value}
            rows={1}
            spellCheck={false}
            placeholder="点击编辑这条待办…"
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            className={cn(
              "textarea-quiet min-h-[24px] w-full [field-sizing:content] pr-5 text-[13px] leading-6",
              block.isCompleted ? "text-muted/70" : "text-ink/90",
            )}
          />

          <button
            type="button"
            aria-label="删除这段待办"
            onClick={handleDelete}
            className="icon-button -mr-1 mt-[-2px] size-6 opacity-0 group-hover/block:opacity-100 focus-visible:opacity-100"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="block-editor group/block rounded-xl px-3.5 pb-2 pt-2.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.2em] text-muted/45">
          文字
        </span>
        <button
          type="button"
          aria-label="删除这段文字"
          onClick={handleDelete}
          className="icon-button -mr-1 size-6 opacity-0 group-hover/block:opacity-100 focus-visible:opacity-100"
        >
          <X size={11} />
        </button>
      </div>
      <textarea
        value={value}
        rows={2}
        spellCheck={false}
        placeholder="写下一点什么…"
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        className="textarea-quiet min-h-[50px] w-full [field-sizing:content] text-[13px] leading-[1.85] text-ink/90"
      />
    </div>
  );
}
