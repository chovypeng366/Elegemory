import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Pin, Search, Sparkles } from "lucide-react";
import { groupByDate } from "../../lib/utils";
import { showCapture } from "../../services/system";
import { useUiStore } from "../../stores/uiStore";
import type { Note } from "../../types";
import { NoteCard } from "../notes/NoteCard";

interface TimelineProps {
  notes: Note[];
}

export function Timeline({ notes }: TimelineProps) {
  const query = useUiStore((state) => state.query);
  const filter = useUiStore((state) => state.filter);

  if (!notes.length) {
    return <BoardEmptyState />;
  }

  const pinned = notes.filter((note) => note.isPinned && !note.isArchived);
  const rest = notes.filter((note) => !(note.isPinned && !note.isArchived));
  const groups = groupByDate(rest);

  return (
    <div className="mx-auto w-full max-w-[1240px] pb-10">
      {pinned.length > 0 && (
        <TimelineGroup
          label="置顶"
          icon={<Pin size={12} className="text-pin" />}
          notes={pinned}
        />
      )}
      {groups.map((group) => (
        <TimelineGroup
          key={group.key}
          label={group.label}
          notes={group.notes}
        />
      ))}
      {query && filter !== "trash" && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10.5px] text-muted/55">
          <Search size={11} />
          搜索范围包含标题与全部文字内容
        </div>
      )}
    </div>
  );
}

function TimelineGroup({
  label,
  notes,
  icon,
}: {
  label: string;
  notes: Note[];
  icon?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="mb-9"
    >
      <header className="mb-4 flex items-center gap-3 px-0.5">
        <span className="flex items-center gap-1.5 font-serif text-[13.5px] tracking-[0.1em] text-ink/70">
          {icon}
          {label}
        </span>
        <span className="text-[10px] tabular-nums text-muted/55">
          {notes.length} 条
        </span>
        <span className="timeline-rule" />
      </header>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(252px,1fr))] items-start gap-x-6 gap-y-7">
        <AnimatePresence initial={false}>
          {notes.map((note, index) => (
            <NoteCard key={note.id} note={note} index={index} />
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function BoardEmptyState() {
  const query = useUiStore((state) => state.query);
  const filter = useUiStore((state) => state.filter);
  const setQuery = useUiStore((state) => state.setQuery);
  const setFilter = useUiStore((state) => state.setFilter);
  const pushToast = useUiStore((state) => state.pushToast);
  const message = query
    ? {
        title: "没有找到相似的记录",
        body: "换一个关键词试试，搜索会匹配标题和全部文字内容。",
      }
    : filter === "trash"
      ? {
          title: "回收站是空的",
          body: "删除的记录会先来到这里，你有机会把它们找回来。",
        }
      : filter === "favorites"
        ? {
            title: "还没有收藏",
            body: "把舍不得弄丢的记录收藏起来，它们会安静地待在这里。",
          }
        : filter === "todos"
          ? {
              title: "还没有待办",
              body: "在速记窗口切换到「待办」，一行写一件事，回车就收好。",
            }
          : filter === "images"
            ? {
                title: "还没有图片记录",
                body: "截图后按 Ctrl + V 粘贴，或把 PNG / JPEG 图片拖进速记窗口。",
              }
            : {
                title: "纸面还很干净",
                body: "从一个念头、一段文字或一张截图开始。记录不需要创建文档。",
              };

  return (
    <div className="mx-auto flex h-full max-w-[420px] flex-col items-center justify-center pb-24 text-center">
      <div aria-hidden="true" className="relative mb-7 h-28 w-44">
        <div className="absolute inset-x-7 top-7 h-24 rotate-[-4deg] rounded-xl border border-accent/15 bg-paper shadow-paper" />
        <div className="absolute inset-x-10 top-3 h-24 rotate-[3deg] rounded-xl border border-line bg-photo shadow-paper" />
        <div className="absolute inset-x-14 top-5 space-y-2.5 rounded-lg px-2 py-4">
          <div className="h-1.5 w-3/4 rounded-full bg-accent/25" />
          <div className="h-1.5 w-full rounded-full bg-muted/15" />
          <div className="h-1.5 w-2/3 rounded-full bg-muted/12" />
        </div>
        <div className="magnet absolute left-1/2 top-0 -translate-x-1/2" />
      </div>

      <h2 className="font-serif text-[19px] tracking-[0.02em] text-ink/85">
        {message.title}
      </h2>
      <p className="mt-2 text-[12px] leading-6 text-muted/80">{message.body}</p>

      <div className="mt-6 flex items-center gap-2">
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="ghost-button focus-ring h-9 rounded-lg px-4 text-[12px]"
          >
            清空搜索
          </button>
        ) : filter !== "all" ? (
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="ghost-button focus-ring h-9 rounded-lg px-4 text-[12px]"
          >
            回到全部记忆
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            showCapture().catch(() => pushToast("暂时无法唤出速记窗口", "error"));
          }}
          className="primary-button focus-ring flex h-9 items-center gap-1.5 rounded-lg px-4 text-[12px] font-medium"
        >
          <Sparkles size={13} />
          记下第一件事
        </button>
      </div>
    </div>
  );
}
