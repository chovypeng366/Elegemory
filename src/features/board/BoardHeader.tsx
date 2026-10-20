import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { CalendarDays, Search, Settings2, X } from "lucide-react";
import { IconButton } from "../../components/IconButton";
import { cn, formatDateKeyLabel, localDateKey } from "../../lib/utils";
import { useUiStore } from "../../stores/uiStore";
import type { BoardFilter } from "../../types";

const meta: Record<BoardFilter, { title: string; subtitle: string }> = {
  all: { title: "全部记忆", subtitle: "按时间收好每一次随手记录" },
  favorites: { title: "收藏", subtitle: "舍不得弄丢的那些" },
  text: { title: "文字", subtitle: "只写着字句的纸片" },
  todos: { title: "待办", subtitle: "还没做完的小事" },
  images: { title: "图片", subtitle: "粘贴、拖入的截图与照片" },
  trash: { title: "回收站", subtitle: "删除的记录会先在这里停留" },
};

interface BoardHeaderProps {
  count: number;
  searchRef: RefObject<HTMLInputElement | null>;
  onOpenSettings: () => void;
}

export function BoardHeader({ count, searchRef, onOpenSettings }: BoardHeaderProps) {
  const filter = useUiStore((state) => state.filter);
  const query = useUiStore((state) => state.query);
  const setQuery = useUiStore((state) => state.setQuery);
  const dateFilter = useUiStore((state) => state.dateFilter);
  const setDateFilter = useUiStore((state) => state.setDateFilter);
  const { title, subtitle } = meta[filter];
  const dateLabel = dateFilter ? formatDateKeyLabel(dateFilter) : "";
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setToday(new Date());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const todayLabel = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

  const description = query
    ? dateFilter
      ? `在 “${query}” 和 ${dateLabel} 中找到 ${count} 条`
      : `在 “${query}” 中找到了 ${count} 条`
    : dateFilter
      ? `${dateLabel} · ${count} 条`
      : filter !== "trash"
        ? `${subtitle} · ${count} 条 · 拖拽卡片可排序`
        : `${subtitle} · ${count} 条`;

  return (
    <div className="flex items-end gap-4 px-8 pb-4 pt-6">
      <div className="min-w-0">
        <p className="mb-1.5 font-serif text-[10.5px] tracking-[0.16em] text-muted/55">
          {todayLabel}
        </p>
        <h1 className="font-serif text-[25px] leading-tight tracking-[0.015em] text-ink">
          {title}
        </h1>
        <p className="mt-1.5 text-[11px] tracking-[0.02em] text-muted/70">
          {description}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="search-field flex h-9 w-[250px] items-center gap-2 rounded-xl px-3 max-[1180px]:w-[200px] max-[940px]:w-[170px]">
          <Search size={14} className="shrink-0 text-muted/65" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索记录、文字或标题…"
            spellCheck={false}
            className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-muted/50"
          />
          {query ? (
            <button
              type="button"
              aria-label="清空搜索"
              onClick={() => setQuery("")}
              className="icon-button size-5 shrink-0"
            >
              <X size={12} />
            </button>
          ) : (
            <span className="kbd shrink-0">Ctrl K</span>
          )}
        </div>

        <div
          className={cn(
            "search-field flex h-9 shrink-0 items-center gap-1 rounded-xl px-2.5",
            dateFilter && "border-accent/40 bg-photo/90",
          )}
          title="按创建日期筛选"
        >
          <CalendarDays
            size={14}
            className={cn(
              "shrink-0",
              dateFilter ? "text-accent" : "text-muted/65",
            )}
          />
          <input
            type="date"
            value={dateFilter}
            max={localDateKey(Date.now())}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="按创建日期筛选"
            className="w-[122px] bg-transparent text-[11px] text-ink/80 outline-none [color-scheme:light]"
          />
          {dateFilter && (
            <button
              type="button"
              aria-label="清除日期筛选"
              onClick={() => setDateFilter("")}
              className="icon-button size-5 shrink-0"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <IconButton label="设置" onClick={onOpenSettings}>
          <Settings2 size={16} />
        </IconButton>
      </div>
    </div>
  );
}
