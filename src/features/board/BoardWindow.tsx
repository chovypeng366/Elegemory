import { useEffect, useMemo, useRef } from "react";
import { onNotesChanged, onWindowFocus, showCapture } from "../../services/system";
import { hasImage, hasTodo } from "../../lib/utils";
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
  const loadSettings = useSettingsStore((state) => state.load);

  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return notes
      .filter((note) => (filter === "trash" ? note.isArchived : !note.isArchived))
      .filter((note) => {
        if (filter === "favorites") return note.isFavorite;
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
    void loadSettings();
  }, [load, loadSettings]);

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
    <div className="paper-grain flex h-full flex-col bg-canvas">
      <WindowChrome />
      <div className="flex min-h-0 flex-1">
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
          <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-14">
            {loading && !loaded ? (
              <TimelineSkeleton />
            ) : (
              <Timeline notes={filtered} />
            )}
          </div>
        </main>
      </div>

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
