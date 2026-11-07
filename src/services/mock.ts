import type {
  AppInfo,
  Asset,
  CreateNoteInput,
  CreateNoteResult,
  GraphEdge,
  GraphNode,
  LinkGraph,
  LinkSuggestion,
  MemoryEcho,
  Note,
  NoteBlock,
  NoteLinkEntry,
  NoteType,
  NewBlockInput,
  WhisperFeedback,
} from "../types";
import type { WhisperHistoryEntry } from "../lib/whisperEngine";
import { previousWorkdayKeyFor, workdayKeyFor } from "../lib/whisperTime";

const STORAGE_KEY = "elegemory.dev.notes.v1";
const SETTINGS_KEY = "elegemory.dev.settings.v1";
const WHISPER_STATS_KEY = "elegemory.dev.whisper.stats.v1";
const WHISPER_HISTORY_KEY = "elegemory.dev.whisper.history.v1";
const LINKS_KEY = "elegemory.dev.links.v1";
const MOCK_MOODS = ["Warm", "Poetic", "Playful", "Calm", "Cozy", "Reflective"];

interface MockLink {
  a: string;
  b: string;
  createdAt: number;
}

function readLinks(): MockLink[] {
  try {
    return JSON.parse(localStorage.getItem(LINKS_KEY) || "[]") as MockLink[];
  } catch {
    return [];
  }
}

function writeLinks(links: MockLink[]) {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

function canonicalLink(a: string, b: string): { a: string; b: string } {
  return a < b ? { a, b } : { a: b, b: a };
}

function connectedMockEdges(edges: GraphEdge[], focusId: string): GraphEdge[] {
  if (!edges.some((edge) => edge.source === focusId || edge.target === focusId)) {
    return [];
  }
  const adjacency = new Map<string, string[]>();
  const add = (from: string, to: string) => {
    adjacency.set(from, [...(adjacency.get(from) ?? []), to]);
  };
  for (const edge of edges) {
    add(edge.source, edge.target);
    add(edge.target, edge.source);
  }
  const visited = new Set<string>();
  const stack = [focusId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const neighbour of adjacency.get(current) ?? []) {
      if (!visited.has(neighbour)) stack.push(neighbour);
    }
  }
  return edges.filter(
    (edge) => visited.has(edge.source) && visited.has(edge.target),
  );
}

interface MockDailyStats {
  note_created_count: number;
  todo_created_count: number;
  daily_mood: string;
  updated_at: number;
}

function readWhisperStats(): Record<string, MockDailyStats> {
  try {
    return JSON.parse(localStorage.getItem(WHISPER_STATS_KEY) || "{}") as Record<
      string,
      MockDailyStats
    >;
  } catch {
    return {};
  }
}

function writeWhisperStats(stats: Record<string, MockDailyStats>) {
  localStorage.setItem(WHISPER_STATS_KEY, JSON.stringify(stats));
}

function readWhisperHistory(): WhisperHistoryEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(WHISPER_HISTORY_KEY) || "[]",
    ) as WhisperHistoryEntry[];
  } catch {
    return [];
  }
}

function uuid(): string {
  return crypto.randomUUID();
}

function svgAsset(id: string, palette: [string, string, string], caption: string): Asset {
  const [sky, hill, accent] = palette;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${sky}"/>
        <stop offset="1" stop-color="#F6EAD5"/>
      </linearGradient>
      <linearGradient id="hill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${hill}"/>
        <stop offset="1" stop-color="${accent}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#sky)"/>
    <circle cx="900" cy="220" r="96" fill="#F5D9A6" opacity="0.9"/>
    <path d="M0 560 C220 470 380 620 590 545 C790 474 940 560 1200 470 L1200 800 L0 800 Z" fill="url(#hill)" opacity="0.85"/>
    <path d="M0 680 C260 590 430 710 700 640 C900 590 1030 660 1200 620 L1200 800 L0 800 Z" fill="${accent}" opacity="0.55"/>
    <text x="72" y="120" font-family="Georgia, serif" font-size="42" fill="#4A4036" opacity="0.85">${caption}</text>
    <text x="72" y="166" font-family="Segoe UI, sans-serif" font-size="20" fill="#6C5F50" opacity="0.6">a quiet place to keep small things</text>
  </svg>`;
  const path = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return {
    id,
    path,
    relativePath: "",
    mimeType: "image/svg+xml",
    width: 1200,
    height: 800,
    sizeBytes: svg.length,
  };
}

function block(
  noteId: string,
  blockType: NoteBlock["blockType"],
  content: string,
  extra: Partial<NoteBlock> = {},
): NoteBlock {
  return {
    id: uuid(),
    noteId,
    blockType,
    content,
    assetId: extra.asset?.id ?? null,
    asset: extra.asset ?? null,
    sortOrder: extra.sortOrder ?? 0,
    isCompleted: extra.isCompleted ?? false,
  };
}

function buildNote(
  offsetMs: number,
  noteType: NoteType,
  title: string,
  blocks: NoteBlock[],
  flags: Partial<Pick<Note, "isPinned" | "isFavorite" | "isArchived">> = {},
): Note {
  const noteId = blocks[0]?.noteId ?? uuid();
  const created = Date.now() - offsetMs;
  return {
    id: noteId,
    type: noteType,
    title,
    createdAt: created,
    updatedAt: created,
    isPinned: flags.isPinned ?? false,
    isFavorite: flags.isFavorite ?? false,
    isArchived: flags.isArchived ?? false,
    blocks: blocks.map((item, index) => ({ ...item, noteId, sortOrder: index })),
  };
}

function seedNotes(): Note[] {
  const day = 86_400_000;
  const noteA = uuid();
  const photoA = svgAsset(uuid(), ["#E8DCC4", "#B9A583", "#C98C64"], "山间的清晨");
  const noteB = uuid();
  const noteC = uuid();
  const noteD = uuid();
  const photoD = svgAsset(uuid(), ["#DDE4DD", "#8FA49B", "#708C83"], "读到的风景");
  const noteE = uuid();
  const noteF = uuid();
  const noteG = uuid();
  const photoG = svgAsset(uuid(), ["#F0E2CA", "#C9A36D", "#A97B4F"], "旧照片");
  const noteH = uuid();
  const noteI = uuid();

  return [
    buildNote(
      18 * 60_000,
      "mixed",
      "山间的清晨",
      [
        block(noteA, "image", "", { asset: photoA }),
        block(noteA, "text", "把窗推开的时候，山雾正好漫到屋檐。今天想把方案的第二稿写完，剩下的时间留给散步。"),
      ],
      { isPinned: true },
    ),
    buildNote(2 * 3_600_000, "text", "不急着做的事", [
      block(noteB, "text", "不急着做完的事，可以先放在纸上。\n\n——记于午后的一杯茶之后"),
    ]),
    buildNote(5 * 3_600_000, "todo", "发布前的三件小事", [
      block(noteC, "todo", "更新 README 截图", { isCompleted: false }),
      block(noteC, "todo", "检查托盘图标的清晰度", { isCompleted: true }),
      block(noteC, "todo", "确认快捷键不与截图工具冲突", { isCompleted: false }),
    ]),
    buildNote(day + 3 * 3_600_000, "mixed", "读到的风景", [
      block(noteD, "image", "", { asset: photoD }),
      block(noteD, "text", "「记录不应当需要创建文档。」\n这句话很适合作为 Elegemory 的注脚。"),
    ], { isFavorite: true }),
    buildNote(3 * day, "text", "关于整理", [
      block(noteE, "text", "整理不是把东西藏起来，而是让下一次需要它的时候，能很快找到。"),
    ], { isFavorite: true }),
    buildNote(6 * day, "todo", "周末清单", [
      block(noteF, "todo", "去旧书店", { isCompleted: true }),
      block(noteF, "todo", "给阳台的薄荷换盆", { isCompleted: true }),
      block(noteF, "todo", "把照片导出来", { isCompleted: true }),
    ]),
    buildNote(34 * day, "image", "旧照片", [
      block(noteG, "image", "", { asset: photoG }),
      block(noteG, "text", "搬家时翻到的一张照片，背后写着 2019 年的秋天。"),
    ]),
    buildNote(72 * day, "text", "一些零散的句子", [
      block(noteH, "text", "1. 慢一点，把一句话写完整。\n2. 留白也是内容的一部分。\n3. 好的工具应该安静。"),
    ]),
    buildNote(day + 6 * 3_600_000, "text", "已经收起的记录", [
      block(noteI, "text", "这是一条已经移入回收站的示例记录，可以在这里恢复或永久删除。"),
    ], { isArchived: true }),
  ];
}

let cache: Note[] | null = null;
const assetRegistry = new Map<string, Asset>();

function load(): Note[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as Note[];
      return cache;
    }
  } catch {
    // fall through to seed
  }
  cache = seedNotes();
  save(cache);
  return cache;
}

function save(notes: Note[]) {
  cache = notes;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // preview mode only; ignore quota errors
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function findNote(notes: Note[], id: string): Note {
  const note = notes.find((item) => item.id === id);
  if (!note) throw new Error("记录不存在或已被删除");
  return note;
}

function touch(note: Note) {
  note.updatedAt = Date.now();
}

function deriveType(blocks: NewBlockInput[] | NoteBlock[]): NoteType {
  const hasImg = blocks.some((item) => item.blockType === "image");
  const hasText = blocks.some(
    (item) => item.blockType === "text" && (item.content ?? "").trim(),
  );
  const hasTodoItem = blocks.some((item) => item.blockType === "todo");
  if (hasImg && (hasText || hasTodoItem)) return "mixed";
  if (hasImg) return "image";
  if (hasTodoItem && !hasText) return "todo";
  return "text";
}

export const mockBackend = {
  async listNotes(): Promise<Note[]> {
    return clone(load());
  },

  async getNote(id: string): Promise<Note> {
    return clone(findNote(load(), id));
  },

  async getPinnedNoteId(): Promise<string | null> {
    const note = load().find((item) => !item.isArchived);
    return note?.id ?? null;
  },

  async getMemoryEcho(): Promise<MemoryEcho | null> {
    const notes = load()
      .filter(
        (note) =>
          !note.isArchived &&
          note.blocks.some(
            (block) => block.blockType !== "image" && block.content.trim(),
          ),
      )
      .sort((left, right) => left.createdAt - right.createdAt);
    const note = notes[0];
    if (!note) return null;
    return {
      note: clone(note),
      daysAgo: Math.max(1, Math.floor((Date.now() - note.createdAt) / 86_400_000)),
    };
  },

  async markNoteOpened(_id: string): Promise<void> {
    // preview mode does not need opened timestamps
  },

  async listNoteLinks(noteId: string): Promise<NoteLinkEntry[]> {
    const notes = load();
    return readLinks()
      .filter((link) => link.a === noteId || link.b === noteId)
      .map((link) => {
        const partnerId = link.a === noteId ? link.b : link.a;
        const note = notes.find((item) => item.id === partnerId);
        return note ? { note: clone(note), linkedAt: link.createdAt } : null;
      })
      .filter((entry): entry is NoteLinkEntry => entry !== null)
      .sort((left, right) => left.note.createdAt - right.note.createdAt);
  },

  async createNoteLink(
    noteId: string,
    relatedId: string,
    _source: "manual" | "suggested",
  ): Promise<NoteLinkEntry[]> {
    const pair = canonicalLink(noteId, relatedId);
    const links = readLinks();
    if (!links.some((link) => link.a === pair.a && link.b === pair.b)) {
      links.push({ ...pair, createdAt: Date.now() });
      writeLinks(links);
    }
    return this.listNoteLinks(noteId);
  },

  async deleteNoteLink(
    noteId: string,
    relatedId: string,
  ): Promise<NoteLinkEntry[]> {
    const pair = canonicalLink(noteId, relatedId);
    writeLinks(
      readLinks().filter(
        (link) => !(link.a === pair.a && link.b === pair.b),
      ),
    );
    return this.listNoteLinks(noteId);
  },

  async findLinkSuggestions(noteId: string): Promise<LinkSuggestion[]> {
    const links = await this.listNoteLinks(noteId);
    const linked = new Set(links.map((entry) => entry.note.id));
    const candidate = load()
      .filter(
        (note) =>
          note.id !== noteId &&
          !note.isArchived &&
          !linked.has(note.id) &&
          note.blocks.some(
            (block) => block.blockType !== "image" && block.content.trim(),
          ),
      )
      .sort((left, right) => left.createdAt - right.createdAt)[0];
    if (!candidate) return [];
    return [
      {
        note: clone(candidate),
        daysAgo: Math.max(
          1,
          Math.floor((Date.now() - candidate.createdAt) / 86_400_000),
        ),
        reason: null,
        source: "local",
      },
    ];
  },

  async findAiLinkSuggestions(noteId: string): Promise<LinkSuggestion[]> {
    const local = await this.findLinkSuggestions(noteId);
    if (local.length > 0) {
      return local.map((suggestion) => ({
        ...suggestion,
        source: "ai" as const,
        reason: "都可能在讨论同一段经历或同一个项目",
      }));
    }
    const candidate = load().find(
      (note) =>
        note.id !== noteId &&
        !note.isArchived &&
        note.blocks.some(
          (block) => block.blockType !== "image" && block.content.trim(),
        ),
    );
    if (!candidate) return [];
    return [
      {
        note: clone(candidate),
        daysAgo: 5,
        reason: "内容与当前记录可能相关",
        source: "ai",
      },
    ];
  },

  async getLinkGraph(noteId?: string): Promise<LinkGraph> {
    const notes = load();
    const byId = new Map(notes.map((note) => [note.id, note]));
    const links = readLinks();
    let edges: GraphEdge[] = links
      .filter((link) => byId.has(link.a) && byId.has(link.b))
      .map((link) => ({
        source: link.a,
        target: link.b,
        createdAt: link.createdAt,
        createdBy: "manual" as const,
      }));

    if (edges.length === 0) {
      const demo = notes
        .filter(
          (note) =>
            !note.isArchived &&
            note.blocks.some(
              (block) => block.blockType !== "image" && block.content.trim(),
            ),
        )
        .slice(0, 8);
      edges = [];
      for (let start = 0; start < demo.length; start += 3) {
        const group = demo.slice(start, start + 3);
        for (let index = 0; index < group.length - 1; index += 1) {
          edges.push({
            source: group[index].id,
            target: group[index + 1].id,
            createdAt: Date.now() - (start + index) * 60_000,
            createdBy: "manual" as const,
          });
        }
      }
    }

    if (noteId) {
      edges = connectedMockEdges(edges, noteId);
    }

    const degree = new Map<string, number>();
    for (const edge of edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
    const nodes: GraphNode[] = Array.from(degree.keys())
      .map((id) => byId.get(id))
      .filter((note): note is Note => Boolean(note))
      .map((note) => ({
        id: note.id,
        title: note.title,
        type: note.type,
        createdAt: note.createdAt,
        isFavorite: note.isFavorite,
        degree: degree.get(note.id) ?? 0,
      }))
      .sort((left, right) => left.createdAt - right.createdAt);

    return { nodes, edges };
  },

  async createNote(input: CreateNoteInput): Promise<CreateNoteResult> {
    const notes = load();
    const noteId = uuid();
    const filtered = input.blocks.filter(
      (item) => (item.content ?? "").trim() || item.assetId,
    );
    if (!filtered.length) throw new Error("内容为空，无法保存");

    const blocks: NoteBlock[] = filtered.map((item, index) => ({
      id: uuid(),
      noteId,
      blockType: item.blockType,
      content: item.blockType === "image" ? "" : (item.content ?? "").trimEnd(),
      assetId: item.assetId ?? null,
      asset: item.assetId ? (assetRegistry.get(item.assetId) ?? null) : null,
      sortOrder: index,
      isCompleted: item.isCompleted ?? false,
    }));

    const firstText = filtered.find((item) => item.blockType !== "image" && item.content?.trim());
    const now = Date.now();
    const note: Note = {
      id: noteId,
      type: deriveType(filtered),
      title: input.title?.trim() || (firstText?.content ?? "").trim().slice(0, 48) || "图片速记",
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      blocks,
    };
    save([note, ...notes]);

    let kind: "note" | "todo" | null = null;
    if (input.feedbackKind === "silent") {
      kind = null;
    } else if (input.feedbackKind === "todo") {
      kind = "todo";
    } else if (input.feedbackKind === "note") {
      kind = "note";
    } else {
      kind = note.type === "todo" ? "todo" : "note";
    }

    let whisper: WhisperFeedback | null = null;
    if (kind) {
      const stats = readWhisperStats();
      const workdayKey = workdayKeyFor();
      let row = stats[workdayKey];
      if (!row) {
        const previous = stats[previousWorkdayKeyFor()];
        const candidates = MOCK_MOODS.filter(
          (mood) => mood !== previous?.daily_mood,
        );
        const pool = candidates.length ? candidates : MOCK_MOODS;
        row = {
          note_created_count: 0,
          todo_created_count: 0,
          daily_mood: pool[Math.floor(Math.random() * pool.length)],
          updated_at: now,
        };
        stats[workdayKey] = row;
      }
      if (kind === "todo") row.todo_created_count += 1;
      else row.note_created_count += 1;
      row.updated_at = now;
      writeWhisperStats(stats);

      const count =
        kind === "todo" ? row.todo_created_count : row.note_created_count;
      whisper = {
        workdayKey,
        noteCreatedCount: row.note_created_count,
        todoCreatedCount: row.todo_created_count,
        dailyMood: row.daily_mood,
        kind,
        isTenth: count === 10,
      };
    }

    return { note: clone(note), whisper };
  },

  async recordWhisper(input: {
    phraseId: string;
    category: string;
    noteType: "note" | "todo";
    shownAt: number;
    workdayKey: string;
  }): Promise<void> {
    const history = readWhisperHistory();
    history.push({ id: uuid(), ...input });
    localStorage.setItem(WHISPER_HISTORY_KEY, JSON.stringify(history));
  },

  async listWhisperHistory(since: number): Promise<WhisperHistoryEntry[]> {
    return clone(readWhisperHistory().filter((entry) => entry.shownAt >= since));
  },

  async setNoteTitle(id: string, title: string): Promise<Note> {
    const notes = load();
    const note = findNote(notes, id);
    note.title = title.trim();
    touch(note);
    save([...notes]);
    return clone(note);
  },

  async setNoteFlag(
    id: string,
    field: "isFavorite" | "isPinned" | "isArchived",
    value: boolean,
  ): Promise<Note> {
    const notes = load();
    const note = findNote(notes, id);
    note[field] = value;
    touch(note);
    save([...notes]);
    return clone(note);
  },

  async deleteNote(id: string): Promise<void> {
    const notes = load().filter((note) => note.id !== id);
    save(notes);
  },

  async addBlock(noteId: string, input: NewBlockInput): Promise<Note> {
    const notes = load();
    const note = findNote(notes, noteId);
    const order = note.blocks.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
    note.blocks.push({
      id: uuid(),
      noteId,
      blockType: input.blockType,
      content: input.blockType === "image" ? "" : (input.content ?? "").trimEnd(),
      assetId: input.assetId ?? null,
      asset: input.assetId ? (assetRegistry.get(input.assetId) ?? null) : null,
      sortOrder: order,
      isCompleted: input.isCompleted ?? false,
    });
    note.type = deriveType(note.blocks);
    touch(note);
    save([...notes]);
    return clone(note);
  },

  async updateBlock(blockId: string, content: string): Promise<Note> {
    const notes = load();
    for (const note of notes) {
      const target = note.blocks.find((item) => item.id === blockId);
      if (target) {
        target.content = content.trimEnd();
        note.type = deriveType(note.blocks);
        touch(note);
        save([...notes]);
        return clone(note);
      }
    }
    throw new Error("内容块不存在或已被删除");
  },

  async deleteBlock(blockId: string): Promise<Note> {
    const notes = load();
    for (const note of notes) {
      const index = note.blocks.findIndex((item) => item.id === blockId);
      if (index >= 0) {
        note.blocks.splice(index, 1);
        note.blocks.forEach((item, order) => {
          item.sortOrder = order;
        });
        note.type = deriveType(note.blocks);
        touch(note);
        save([...notes]);
        return clone(note);
      }
    }
    throw new Error("内容块不存在或已被删除");
  },

  async toggleBlockCompleted(blockId: string): Promise<Note> {
    const notes = load();
    for (const note of notes) {
      const target = note.blocks.find((item) => item.id === blockId);
      if (target) {
        target.isCompleted = !target.isCompleted;
        touch(note);
        save([...notes]);
        return clone(note);
      }
    }
    throw new Error("内容块不存在或已被删除");
  },

  async saveImageAsset(base64: string): Promise<Asset> {
    const path = `data:image/png;base64,${base64}`;
    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const image = new window.Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({ width: 1200, height: 800 });
      image.src = path;
    });
    const asset: Asset = {
      id: uuid(),
      path,
      relativePath: "",
      mimeType: "image/png",
      width: dimensions.width,
      height: dimensions.height,
      sizeBytes: Math.round((base64.length * 3) / 4),
    };
    assetRegistry.set(asset.id, asset);
    return asset;
  },

  async importImagePath(): Promise<Asset> {
    throw new Error("浏览器预览模式不支持读取本地路径，请直接在窗口中拖入图片");
  },

  async getAssetDataUrl(assetId: string): Promise<string> {
    for (const note of load()) {
      for (const block of note.blocks) {
        if (block.asset?.id === assetId) return block.asset.path;
      }
    }
    const asset = assetRegistry.get(assetId);
    if (asset) return asset.path;
    throw new Error("图片资源不存在");
  },

  async savePngData(dataUrl: string, fileName: string): Promise<string | null> {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return fileName;
  },

  async getSettings(): Promise<Record<string, string>> {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const stored = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      return { capture_shortcut: "Ctrl+Shift+Space", ...stored };
    } catch {
      return { capture_shortcut: "Ctrl+Shift+Space" };
    }
  },

  async setSetting(key: string, value: string): Promise<void> {
    let current: Record<string, string> = { capture_shortcut: "Ctrl+Shift+Space" };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) current = { ...current, ...(JSON.parse(raw) as Record<string, string>) };
    } catch {
      // keep defaults
    }
    current[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  },

  async setCaptureShortcut(shortcut: string): Promise<string> {
    const trimmed = shortcut.trim();
    if (!trimmed) throw new Error("快捷键不能为空");
    await this.setSetting("capture_shortcut", trimmed);
    return trimmed;
  },

  async getAppInfo(): Promise<AppInfo> {
    const notes = load();
    return {
      version: "0.2.1 · 浏览器预览",
      dataDir: "Tauri 模式下为系统应用数据目录",
      dbPath: "Tauri 模式下为 elegemory.db",
      noteCount: notes.length,
      archivedCount: notes.filter((note) => note.isArchived).length,
      assetCount: notes.reduce((sum, note) => sum + note.blocks.filter((b) => b.asset).length, 0),
    };
  },
};
