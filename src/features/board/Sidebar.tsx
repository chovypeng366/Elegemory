import { useMemo } from "react";
import {
  AlignLeft,
  ArrowUpRight,
  ChevronRight,
  Image as ImageIcon,
  LayoutGrid,
  ListChecks,
  Plus,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import { cn, hasImage, hasTodo, isTextNote } from "../../lib/utils";
import { captureShortcutLabel, useSettingsStore } from "../../stores/settingsStore";
import { useNotesStore } from "../../stores/notesStore";
import { useUiStore } from "../../stores/uiStore";
import type { BoardFilter } from "../../types";

const items: Array<{
  key: BoardFilter;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { key: "all", label: "全部记忆", icon: LayoutGrid },
  { key: "favorites", label: "收藏", icon: Star },
  { key: "text", label: "文字", icon: AlignLeft },
  { key: "images", label: "图片", icon: ImageIcon },
  { key: "todos", label: "待办", icon: ListChecks },
  { key: "trash", label: "回收站", icon: Trash2 },
];

interface SidebarProps {
  onNewCapture: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onNewCapture, onOpenSettings }: SidebarProps) {
  const notes = useNotesStore((state) => state.notes);
  const filter = useUiStore((state) => state.filter);
  const setFilter = useUiStore((state) => state.setFilter);
  const closeNote = useUiStore((state) => state.closeNote);
  const settings = useSettingsStore((state) => state.settings);
  const shortcut = captureShortcutLabel(settings);

  const counts = useMemo(() => {
    const active = notes.filter((note) => !note.isArchived);
    return {
      all: active.length,
      favorites: active.filter((note) => note.isFavorite).length,
      text: active.filter(isTextNote).length,
      todos: active.filter(hasTodo).length,
      images: active.filter(hasImage).length,
      trash: notes.filter((note) => note.isArchived).length,
    } satisfies Record<BoardFilter, number>;
  }, [notes]);

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line/70 bg-canvas-deep/35 px-3.5 pb-4 pt-5">
      <button
        type="button"
        onClick={onNewCapture}
        className="primary-button focus-ring group mb-6 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/15 shadow-inner">
          <Plus size={15} strokeWidth={2.4} />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[12.5px] font-medium tracking-[0.02em]">新建速记</span>
          <span className="mt-0.5 truncate text-[9.5px] text-white/65">{shortcut}</span>
        </span>
        <ArrowUpRight
          size={14}
          className="ml-auto shrink-0 opacity-70 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </button>

      <div className="mb-2 px-2 text-[9.5px] font-medium tracking-[0.2em] text-muted/55">
        浏览
      </div>

      <nav className="space-y-1">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            data-active={filter === key}
            onClick={() => {
              setFilter(key);
              closeNote();
            }}
            className="sidebar-item focus-ring"
          >
            <Icon size={15} strokeWidth={1.8} />
            <span>{label}</span>
            <span
              className={cn(
                "ml-auto text-[10px] tabular-nums",
                filter === key ? "text-muted" : "text-muted/55",
              )}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={onOpenSettings}
          className="sidebar-item focus-ring"
        >
          <Settings size={15} strokeWidth={1.8} />
          <span>设置</span>
          <ChevronRight size={13} className="ml-auto opacity-45" />
        </button>
      </div>
    </aside>
  );
}
