import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { onNotesChanged, onWindowFocus, showCapture } from "../../services/system";
import {
  APPEARANCE_KEYS,
  DEFAULT_BACKGROUND_OPACITY,
  clampBackgroundOpacity,
  parseBoardOrder,
} from "../../lib/appearance";
import { assetSrc } from "../../lib/assets";
import {
  ENCOURAGEMENT_KEYS,
  highWaterMark,
  resolveEncouragement,
} from "../../lib/encouragement";
import {
  groupByDate,
  hasImage,
  hasTodo,
  isTextNote,
  orderNotes,
} from "../../lib/utils";
import { useNotesStore } from "../../stores/notesStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUiStore } from "../../stores/uiStore";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { NoteDetailDrawer } from "../notes/NoteDetailDrawer";
import { SettingsDialog } from "../settings/SettingsDialog";
import { BoardHeader } from "./BoardHeader";
import { Sidebar } from "./Sidebar";
import { Timeline } from "./Timeline";
import { WindowChrome } from "./WindowChrome";

export function BoardWindow() {
  const notes = useNotesStore((state) => state.notes);
  const loading = useNotesStore((state) => state.loading);
  const loaded = useNotesStore((state) => state.loaded);
  const load = useNotesStore((state) => state.load);
  const filter = useUiStore((state) => state.filter);
  const query = useUiStore((state) => state.query);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const settings = useSettingsStore((state) => state.settings);
  const updateSetting = useSettingsStore((state) => state.updateSetting);
  const reducedMotion = useReducedMotion();

  const searchRef = useRef<HTMLInputElement>(null);

  const orderMap = useMemo(
    () => parseBoardOrder(settings[APPEARANCE_KEYS.boardOrder]),
    [settings],
  );
  const canReorder = filter !== "trash" && !query.trim();

  const backgroundPath = settings[APPEARANCE_KEYS.background] ?? "";
  const backgroundOpacity = clampBackgroundOpacity(
    Number(settings[APPEARANCE_KEYS.backgroundOpacity] ?? DEFAULT_BACKGROUND_OPACITY),
  );

  const [hour, setHour] = useState(() => new Date().getHours());

  const noteCount = useMemo(
    () => notes.filter((note) => !note.isArchived).length,
    [notes],
  );
  const todoCount = useMemo(
    () =>
      notes
        .filter((note) => !note.isArchived)
        .reduce(
          (total, note) =>
            total + note.blocks.filter((block) => block.blockType === "todo").length,
          0,
        ),
    [notes],
  );

  const noteMark = highWaterMark(
    settings[ENCOURAGEMENT_KEYS.notes],
    noteCount,
  );
  const todoMark = highWaterMark(
    settings[ENCOURAGEMENT_KEYS.todos],
    todoCount,
  );

  const encouragement = resolveEncouragement(noteMark, todoMark, hour);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return notes
      .filter((note) => (filter === "trash" ? note.isArchived : !note.isArchived))
      .filter((note) => {
        if (filter === "favorites") return note.isFavorite;
        if (filter === "text") return isTextNote(note);
        if (filter === "todos") return hasTodo(note);
        if (filter === "images") return hasImage(note);
        return true;
      })
      .filter((note) => {
        if (!keyword) return true;
        const haystack = [note.title, ...note.blocks.map((block) => block.content)]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      });
  }, [notes, filter, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (noteCount > Number(settings[ENCOURAGEMENT_KEYS.notes] ?? 0)) {
      void updateSetting(ENCOURAGEMENT_KEYS.notes, String(noteCount));
    }
  }, [noteCount, settings, updateSetting]);

  useEffect(() => {
    if (todoCount > Number(settings[ENCOURAGEMENT_KEYS.todos] ?? 0)) {
      void updateSetting(ENCOURAGEMENT_KEYS.todos, String(todoCount));
    }
  }, [todoCount, settings, updateSetting]);

  useEffect(() => {
    const timer = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleReorder = (groupKey: string, visibleIds: string[]) => {
    const pool = notes.filter(
      (note) =>
        !note.isArchived &&
        (groupKey === "pinned" ? note.isPinned : !note.isPinned),
    );
    const groupNotes =
      groupKey === "pinned"
        ? pool
        : (groupByDate(pool).find((group) => group.key === groupKey)?.notes ?? []);
    const fullIds = orderNotes(groupNotes, orderMap[groupKey]).map(
      (note) => note.id,
    );

    let merged = visibleIds;
    if (fullIds.length > 0) {
      const queue = [...visibleIds];
      const visible = new Set(visibleIds);
      merged = fullIds.map((id) => (visible.has(id) ? (queue.shift() ?? id) : id));
      for (const id of queue) {
        if (id) merged.push(id);
      }
    }

    const next = { ...orderMap, [groupKey]: merged };
    void updateSetting(APPEARANCE_KEYS.boardOrder, JSON.stringify(next));
  };

  useEffect(() => {
    let disposed = false;
    const unsubscribes: Array<() => void> = [];

    const register = (promise: Promise<() => void>) => {
      void promise.then((unlisten) => {
        if (disposed) unlisten();
        else unsubscribes.push(unlisten);
      });
    };

    register(onNotesChanged(() => void load(true)));
    register(onWindowFocus(() => void load(true)));

    return () => {
      disposed = true;
      unsubscribes.forEach((unlisten) => unlisten());
    };
  }, [load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useUiStore.getState();

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void showCapture().catch(() => {
          ui.pushToast("暂时无法唤出速记窗口", "error");
        });
        return;
      }

      if (event.key === "Escape") {
        if (ui.pendingConfirm) {
          ui.resolveConfirm(false);
          return;
        }
        if (ui.settingsOpen) {
          ui.setSettingsOpen(false);
          return;
        }
        if (ui.selectedNoteId) {
          ui.closeNote();
          return;
        }
        if (ui.query) ui.setQuery("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openSettings = () => setSettingsOpen(true);

  return (
    <div className="paper-grain relative flex h-full flex-col bg-canvas">
      {backgroundPath && (
        <div
          aria-hidden="true"
          className="appearance-backdrop"
          style={{
            backgroundImage: `url("${assetSrc(backgroundPath)}")`,
            opacity: backgroundOpacity,
          }}
        />
      )}
      <WindowChrome />
      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar
          onNewCapture={() => {
            void showCapture().catch(() => {
              useUiStore.getState().pushToast("暂时无法唤出速记窗口", "error");
            });
          }}
          onOpenSettings={openSettings}
        />
        <main className="flex min-w-0 flex-1 flex-col">
          <BoardHeader
            count={filtered.length}
            searchRef={searchRef}
            onOpenSettings={openSettings}
          />
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-10">
            {loading && !loaded ? (
              <TimelineSkeleton />
            ) : (
              <Timeline
                notes={filtered}
                orderMap={orderMap}
                canReorder={canReorder}
                onReorder={handleReorder}
              />
            )}
          </div>
        </main>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {encouragement && (
          <motion.footer
            key={encouragement}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 4 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="relative z-10 flex shrink-0 items-center justify-center gap-2 border-t border-line/60 bg-canvas/45 px-6 py-2.5 backdrop-blur-[2px]"
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent/70" />
            <span className="text-[11px] tracking-[0.03em] text-muted/80">
              {encouragement}
            </span>
          </motion.footer>
        )}
      </AnimatePresence>

      <NoteDetailDrawer />
      <SettingsDialog />
      <ConfirmDialog />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1240px] animate-pulse pt-2">
      <div className="mb-4 h-3 w-24 rounded-full bg-ink/5" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(252px,1fr))] gap-x-6 gap-y-7">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="h-44 rounded-[18px] border border-line/50 bg-paper/50"
            style={{ opacity: 1 - index * 0.09 }}
          />
        ))}
      </div>
    </div>
  );
}
