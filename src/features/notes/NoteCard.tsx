import { motion, useReducedMotion } from "motion/react";
import {
  Check,
  Copy,
  GripVertical,
  Pencil,
  Pin,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { assetSrc } from "../../lib/assets";
import {
  cn,
  errorMessage,
  firstImage,
  formatShortTimestamp,
  notePlainText,
  textBlocks,
  tiltStyle,
  todoBlocks,
  typeLabel,
} from "../../lib/utils";
import { copyImageToClipboard, copyTextToClipboard } from "../../services/clipboard";
import { useNotesStore } from "../../stores/notesStore";
import { useUiStore } from "../../stores/uiStore";
import type { Note, NoteBlock } from "../../types";
import { IconButton } from "../../components/IconButton";
import { MagneticPin } from "../../components/MagneticPin";

interface NoteCardProps {
  note: Note;
  index: number;
  canReorder?: boolean;
}

export function NoteCard({ note, index, canReorder = false }: NoteCardProps) {
  const reduced = useReducedMotion();
  const openNote = useUiStore((state) => state.openNote);
  const pushToast = useUiStore((state) => state.pushToast);
  const requestConfirm = useUiStore((state) => state.requestConfirm);

  const toggleFavorite = useNotesStore((state) => state.toggleFavorite);
  const togglePinned = useNotesStore((state) => state.togglePinned);
  const toggleTodo = useNotesStore((state) => state.toggleTodo);
  const archiveNote = useNotesStore((state) => state.archiveNote);
  const restoreNote = useNotesStore((state) => state.restoreNote);
  const deleteNotePermanently = useNotesStore((state) => state.deleteNotePermanently);

  const image = firstImage(note);
  const todos = todoBlocks(note);
  const texts = textBlocks(note)
    .map((block) => block.content.trim())
    .filter(Boolean);
  const text = texts.join("\n");
  const archived = note.isArchived;

  const handleCopy = async () => {
    try {
      if (image) {
        await copyImageToClipboard(image.path);
        pushToast("图片已复制到剪贴板", "success");
      } else {
        await copyTextToClipboard(notePlainText(note));
        pushToast("文字已复制到剪贴板", "success");
      }
    } catch (error) {
      pushToast(errorMessage(error), "error");
    }
  };

  const handleDelete = async () => {
    const confirmed = await requestConfirm({
      title: "永久删除这条记录？",
      description: "删除后无法恢复，记录中的图片也会从本机移除。",
      confirmLabel: "永久删除",
      tone: "danger",
    });
    if (confirmed) {
      await deleteNotePermanently(note);
    }
  };

  const content = image ? (
    <div className="photo-sheet relative rounded-[16px] px-2.5 pb-2.5 pt-3.5">
      <MagneticPin className="absolute left-1/2 top-[-12px] z-10 -translate-x-1/2" />
      <div className="overflow-hidden rounded-[10px] bg-canvas-deep/70">
        <img
          src={assetSrc(image.path)}
          alt={note.title || "速记图片"}
          draggable={false}
          loading="lazy"
          className="max-h-[320px] w-full object-cover"
        />
      </div>
      <div className="px-1.5">
        {todos.length > 0 ? (
          <div className="pt-3">
            <TodoPreview todos={todos} archived={archived} onToggle={toggleTodo} />
          </div>
        ) : text ? (
          <p className="line-clamp-4 whitespace-pre-wrap break-words pt-3 text-[12.5px] leading-6 text-ink/85">
            {text}
          </p>
        ) : null}
        <CardFooter note={note} className={cn(todos.length || text ? "" : "mt-3")} />
      </div>
    </div>
  ) : todos.length > 0 ? (
    <div className="paper-sheet relative rounded-[18px] px-5 pb-4 pt-4.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.18em] text-muted/65">
          <span className="size-1.5 rounded-full bg-pin/70" />
          待办
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted/60">
            {todos.filter((todo) => todo.isCompleted).length}/{todos.length}
          </span>
          {!archived && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openNote(note.id);
              }}
              className="focus-ring flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] text-muted/60 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <Pencil size={10} />
              编辑
            </button>
          )}
        </span>
      </div>
      <TodoPreview todos={todos} archived={archived} onToggle={toggleTodo} />
      {text && (
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap border-t border-line/60 pt-3 text-[11.5px] leading-5 text-muted/85">
          {text}
        </p>
      )}
      <CardFooter note={note} />
    </div>
  ) : (
    <div className="paper-sheet relative rounded-[18px] px-5 pb-4 pt-5">
      {note.isPinned && <span className="washi-tape" aria-hidden="true" />}
      <p className="line-clamp-[9] whitespace-pre-wrap break-words text-[13.2px] leading-[1.9] text-ink/90">
        {text || "（空白记录）"}
      </p>
      <CardFooter note={note} />
    </div>
  );

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: -12, scale: 0.975 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? undefined : { opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
      transition={{
        type: "spring",
        stiffness: 285,
        damping: 26,
        mass: 0.75,
        delay: Math.min(index * 0.03, 0.24),
      }}
      onClick={() => openNote(note.id)}
      onKeyDown={(event) => {
        if (
          (event.key === "Enter" || event.key === " ") &&
          event.target === event.currentTarget
        ) {
          event.preventDefault();
          openNote(note.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`查看记录：${note.title || "速记"}`}
      data-note-id={note.id}
      className="focus-ring group relative cursor-pointer rounded-[18px]"
    >
      <div
        className={cn("note-tilt", canReorder && "cursor-grab active:cursor-grabbing")}
        style={tiltStyle(note.id)}
        draggable={canReorder}
      >
        {content}
      </div>

      {canReorder && (
        <span
          data-drag-handle
          draggable
          role="button"
          aria-label="拖拽排序"
          title="拖拽排序"
          onClick={(event) => event.stopPropagation()}
          className="absolute left-2 top-2 z-20 flex size-7 cursor-grab items-center justify-center rounded-lg border border-line/70 bg-photo/85 text-muted/65 opacity-40 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={13} />
        </span>
      )}

      <div
        onClick={(event) => event.stopPropagation()}
        className="absolute right-2 top-2 z-20 flex translate-y-[-2px] items-center gap-0.5 rounded-[10px] border border-line/70 bg-photo/90 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
      >
        {archived ? (
          <>
            <IconButton
              size="sm"
              label="恢复到白板"
              onClick={() => void restoreNote(note)}
            >
              <RotateCcw size={13} />
            </IconButton>
            <IconButton
              size="sm"
              label="永久删除"
              onClick={() => void handleDelete()}
            >
              <Trash2 size={13} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton
              size="sm"
              label="编辑"
              onClick={() => openNote(note.id)}
            >
              <Pencil size={13} />
            </IconButton>
            <IconButton size="sm" label="复制" onClick={() => void handleCopy()}>
              <Copy size={13} />
            </IconButton>
            <IconButton
              size="sm"
              label={note.isFavorite ? "取消收藏" : "收藏"}
              active={note.isFavorite}
              onClick={() => void toggleFavorite(note)}
            >
              <Star size={13} className={cn(note.isFavorite && "fill-accent text-accent")} />
            </IconButton>
            <IconButton
              size="sm"
              label={note.isPinned ? "取消置顶" : "置顶"}
              active={note.isPinned}
              onClick={() => void togglePinned(note)}
            >
              <Pin size={13} className={cn(note.isPinned && "text-pin")} />
            </IconButton>
            <IconButton
              size="sm"
              label="移入回收站"
              onClick={() => {
                void archiveNote(note);
              }}
            >
              <Trash2 size={13} />
            </IconButton>
          </>
        )}
      </div>
    </motion.article>
  );
}

function TodoPreview({
  todos,
  archived,
  onToggle,
}: {
  todos: NoteBlock[];
  archived: boolean;
  onToggle: (blockId: string) => Promise<Note | null>;
}) {
  const visible = todos.slice(0, 6);

  return (
    <ul className="space-y-2.5">
      {visible.map((todo) => (
        <li key={todo.id} className="flex items-start gap-2.5">
          <button
            type="button"
            disabled={archived}
            aria-label={todo.isCompleted ? "标记为未完成" : "标记为完成"}
            onClick={(event) => {
              event.stopPropagation();
              if (!archived) void onToggle(todo.id);
            }}
            className={cn(
              "mt-[3px] flex size-[16px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-200",
              todo.isCompleted
                ? "border-pin bg-pin text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"
                : "border-ink/20 bg-white/55 text-transparent hover:border-pin/70 hover:bg-pin/5",
              archived && "cursor-default opacity-70",
            )}
          >
            <motion.span
              initial={false}
              animate={{
                scale: todo.isCompleted ? 1 : 0.4,
                opacity: todo.isCompleted ? 1 : 0,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
            >
              <Check size={11} strokeWidth={3.2} />
            </motion.span>
          </button>
          <span className="relative min-w-0 flex-1 text-[12.8px] leading-6 text-ink/90">
            <span
              className={cn(
                "break-words transition-colors duration-300",
                todo.isCompleted && "text-muted/65",
              )}
            >
              {todo.content}
            </span>
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-[11px] h-[1.2px] origin-left rounded bg-muted/55"
              initial={false}
              animate={{ width: todo.isCompleted ? "100%" : "0%" }}
              transition={{ duration: 0.34, ease: "easeOut" }}
            />
          </span>
        </li>
      ))}
      {todos.length > visible.length && (
        <li className="pl-[26px] text-[10.5px] text-muted/55">
          还有 {todos.length - visible.length} 项…
        </li>
      )}
    </ul>
  );
}

function CardFooter({ note, className }: { note: Note; className?: string }) {
  return (
    <footer
      className={cn(
        "mt-4 flex items-center justify-between text-[10px] text-muted/65",
        className,
      )}
    >
      <span className="tabular-nums tracking-[0.02em]">
        {formatShortTimestamp(note.createdAt)}
      </span>
      <span className="flex items-center gap-2">
        {note.isFavorite && (
          <Star size={10.5} className="fill-accent/30 text-accent/90" />
        )}
        {note.isPinned && <Pin size={10.5} className="text-pin/90" />}
        <span className="tracking-[0.08em] text-muted/50">
          {note.isArchived ? "已删除" : typeLabel(note)}
        </span>
      </span>
    </footer>
  );
}
