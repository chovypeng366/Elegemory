import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Link2,
  Loader2,
  Network,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { errorMessage, formatDateLabel } from "../../lib/utils";
import { api } from "../../services/api";
import { useAiStore } from "../../stores/aiStore";
import { useNotesStore } from "../../stores/notesStore";
import { useUiStore } from "../../stores/uiStore";
import type { LinkSuggestion, Note, NoteLinkEntry } from "../../types";

interface NoteThreadsProps {
  note: Note;
  archived: boolean;
}

export function NoteThreads({ note, archived }: NoteThreadsProps) {
  const notes = useNotesStore((state) => state.notes);
  const openNote = useUiStore((state) => state.openNote);
  const openLinkGraph = useUiStore((state) => state.openLinkGraph);
  const pushToast = useUiStore((state) => state.pushToast);
  const aiStatus = useAiStore((state) => state.status);
  const aiReady = Boolean(aiStatus?.configured && aiStatus.enabled && !archived);

  const [links, setLinks] = useState<NoteLinkEntry[]>([]);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<LinkSuggestion[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLinks([]);
    setSuggestions([]);
    setAiSuggestions([]);
    setAiBusy(false);
    setDismissed(new Set());
    setPickerOpen(false);
    setQuery("");
    setLoading(true);

    const requests: Promise<unknown>[] = [api.listNoteLinks(note.id)];
    if (!archived) requests.push(api.findLinkSuggestions(note.id));

    void Promise.all(requests)
      .then(([linked, suggested]) => {
        if (!alive) return;
        setLinks(linked as NoteLinkEntry[]);
        setSuggestions((suggested as LinkSuggestion[] | undefined) ?? []);
      })
      .catch(() => {
        // Threads are optional; the note itself should still open normally.
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [note.id, archived]);

  const linkedIds = useMemo(
    () => new Set(links.map((entry) => entry.note.id)),
    [links],
  );

  const candidates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return notes
      .filter(
        (candidate) =>
          !candidate.isArchived &&
          candidate.id !== note.id &&
          !linkedIds.has(candidate.id),
      )
      .filter((candidate) => {
        if (!keyword) return true;
        return [candidate.title, ...candidate.blocks.map((block) => block.content)]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 8);
  }, [notes, note.id, linkedIds, query]);

  const visibleSuggestion = [...aiSuggestions, ...suggestions].find(
    (suggestion) => !dismissed.has(suggestion.note.id),
  );

  const askAi = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const found = await api.findAiLinkSuggestions(note.id);
      setAiSuggestions(found);
      if (found.length > 0) {
        pushToast(`AI 找到 ${found.length} 条可能的关联`, "success");
      } else {
        pushToast("AI 没有找到明确的关联", "info");
      }
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setAiBusy(false);
    }
  };

  const link = async (relatedId: string, source: "manual" | "suggested") => {
    if (linking) return;
    setLinking(relatedId);
    try {
      const next = await api.createNoteLink(note.id, relatedId, source);
      setLinks(next);
      setSuggestions((current) =>
        current.filter((suggestion) => suggestion.note.id !== relatedId),
      );
      setAiSuggestions((current) =>
        current.filter((suggestion) => suggestion.note.id !== relatedId),
      );
      setPickerOpen(false);
      pushToast("Memory Threads 已连上", "success");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setLinking(null);
    }
  };

  const unlink = async (relatedId: string) => {
    if (linking) return;
    setLinking(relatedId);
    try {
      const next = await api.deleteNoteLink(note.id, relatedId);
      setLinks(next);
      pushToast("已解除这条关联", "info");
    } catch (error) {
      pushToast(errorMessage(error), "error");
    } finally {
      setLinking(null);
    }
  };

  return (
    <section className="mt-7 border-t border-line/60 pt-5">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div>
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted/65">
            <Link2 size={12} />
             Memory Threads
            {links.length > 0 && (
              <span className="normal-case tracking-normal text-muted/45">
                · {links.length}
              </span>
            )}
          </span>
          <p className="mt-1 text-[9.5px] leading-4 text-muted/50">
            让不同时间里的想法，沿着一条线接起来。
          </p>
        </div>
        {!archived && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {aiReady && (
              <button
                type="button"
                disabled={aiBusy}
                onClick={() => void askAi()}
                title="把当前记录与候选摘录发送给 DeepSeek 进行语义判断"
                className="ghost-button focus-ring flex h-7 items-center gap-1 rounded-lg px-2.5 text-[10px] disabled:cursor-wait disabled:opacity-50"
              >
                {aiBusy ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Sparkles size={11} />
                )}
                AI 建议
              </button>
            )}
            <button
              type="button"
              onClick={() => openLinkGraph(note.id)}
              className="ghost-button focus-ring flex h-7 items-center gap-1 rounded-lg px-2.5 text-[10px]"
            >
              <Network size={11} />
              图谱
            </button>
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              className="ghost-button focus-ring flex h-7 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[10px]"
            >
              {pickerOpen ? (
                <>
                  <X size={11} />
                  收起
                </>
              ) : (
                <>
                  <Link2 size={11} />
                  关联记忆
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-[10.5px] text-muted/55">
          <Loader2 size={11} className="animate-spin" />
          正在找相关的记忆…
        </div>
      ) : links.length > 0 ? (
        <div className="space-y-1.5">
          {links.map((entry) => (
            <div
              key={entry.note.id}
              className="group flex items-center gap-1 rounded-lg border border-line/60 bg-photo/40 transition-colors hover:border-accent/25 hover:bg-photo/70"
            >
              <button
                type="button"
                onClick={() => openNote(entry.note.id)}
                className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 py-2 text-left"
              >
                <span className="w-[52px] shrink-0 text-[9.5px] tabular-nums text-muted/55">
                  {formatDateLabel(entry.note.createdAt)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink/80">
                  {entry.note.title || "速记"}
                </span>
                <ArrowUpRight
                  size={11}
                  className="shrink-0 text-muted/35 transition-colors group-hover:text-accent"
                />
              </button>
              {!archived && (
                <button
                  type="button"
                  aria-label="解除关联"
                  title="解除关联"
                  disabled={linking !== null}
                  onClick={() => void unlink(entry.note.id)}
                  className="focus-ring mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted/40 opacity-0 transition-all hover:bg-ink/5 hover:text-ink/70 group-hover:opacity-100 disabled:cursor-wait"
                >
                  {linking === entry.note.id ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <X size={11} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10.5px] leading-5 text-muted/55">
          还没有连线。可以手动把这条记录和另一段想法连起来。
        </p>
      )}

      {visibleSuggestion && !archived && (
        <div className="mt-3 rounded-xl border border-pin/20 bg-pin/[0.045] p-3">
          <p className="flex items-start gap-1.5 text-[10.5px] leading-5 text-ink/75">
            <Sparkles size={11} className="mt-1 shrink-0 text-pin" />
            <span>
              {visibleSuggestion.source === "ai"
                ? "AI 觉得它可能与"
                : "这个想法，似乎与"}{" "}
              {visibleSuggestion.daysAgo > 0
                ? `${visibleSuggestion.daysAgo} 天前`
                : "今天"}
              的「{visibleSuggestion.note.title || "一条记忆"}」有关。
            </span>
          </p>
          {visibleSuggestion.reason && (
            <p className="mt-1 pl-[18px] text-[9.5px] leading-4 text-muted/60">
              {visibleSuggestion.reason}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={linking !== null}
              onClick={() => void link(visibleSuggestion.note.id, "suggested")}
              className="primary-button focus-ring flex h-7 items-center gap-1 rounded-lg px-2.5 text-[10px] font-medium disabled:cursor-wait"
            >
              {linking === visibleSuggestion.note.id ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Link2 size={10} />
              )}
              建立关联
            </button>
            <button
              type="button"
              onClick={() =>
                setDismissed((current) => {
                  const next = new Set(current);
                  next.add(visibleSuggestion.note.id);
                  return next;
                })
              }
              className="ghost-button focus-ring flex h-7 rounded-lg px-2.5 text-[10px]"
            >
              忽略
            </button>
            <button
              type="button"
              onClick={() => openNote(visibleSuggestion.note.id)}
              className="focus-ring rounded-md px-1.5 py-1 text-[10px] text-muted/60 transition-colors hover:text-ink"
            >
              先看看
            </button>
          </div>
        </div>
      )}

      {pickerOpen && !archived && (
        <div className="mt-3 rounded-xl border border-line/70 bg-canvas/45 p-2.5">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-line/70 bg-photo/65 px-2.5">
            <Search size={12} className="shrink-0 text-muted/55" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索要关联的记忆…"
              spellCheck={false}
              className="w-full bg-transparent text-[11px] text-ink outline-none placeholder:text-muted/45"
            />
          </div>
          <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-0.5">
            {candidates.length > 0 ? (
              candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  disabled={linking !== null}
                  onClick={() => void link(candidate.id, "manual")}
                  className="focus-ring flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-photo/70 disabled:cursor-wait"
                >
                  <span className="w-[52px] shrink-0 text-[9.5px] tabular-nums text-muted/50">
                    {formatDateLabel(candidate.createdAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-ink/75">
                    {candidate.title || "速记"}
                  </span>
                  {linking === candidate.id ? (
                    <Loader2 size={11} className="animate-spin text-accent" />
                  ) : (
                    <Link2 size={11} className="shrink-0 text-muted/35" />
                  )}
                </button>
              ))
            ) : (
              <p className="px-2 py-3 text-center text-[10px] text-muted/50">
                没有找到可以关联的其他记忆
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
