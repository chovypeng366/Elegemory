export const NOTE_MILESTONES: Record<number, string> = {
  1: "第一笔，开始了。",
  2: "两笔，手感回来了。",
  3: "三笔，节奏对了。",
  4: "四笔，越写越顺。",
  5: "五笔，这页纸记住你了。",
  10: "这里是地狱吗",
};

export const TODO_MILESTONES: Record<number, string> = {
  1: "第一件事，写下来就轻了。",
  2: "两件小事，排好队了。",
  3: "三件，一件一件来。",
  4: "四件，稳住。",
  5: "五件，节奏在你手里。",
  10: "这里是地狱吗",
};

export const ENCOURAGEMENT_KEYS = {
  notes: "milestone_notes_max",
  todos: "milestone_todos_max",
} as const;

export interface MilestoneHit {
  count: number;
  message: string;
}

export function milestoneFor(
  count: number,
  table: Record<number, string>,
): MilestoneHit | null {
  const reached = Object.keys(table)
    .map(Number)
    .filter((threshold) => Number.isFinite(threshold) && count >= threshold)
    .sort((a, b) => a - b);

  if (!reached.length) return null;

  const threshold = reached[reached.length - 1];
  return { count: threshold, message: table[threshold] };
}

export function lateNightMessage(hour: number): string | null {
  if (hour === 1) return "一点多了，早点休息，纸不会跑。";
  if (hour === 2) return "两点钟了，明天再写也来得及。";
  if (hour >= 3 && hour < 5) return "快天亮了，先睡一会儿吧。";
  return null;
}

export function resolveEncouragement(
  noteCount: number,
  todoCount: number,
  hour: number,
): string | null {
  const late = lateNightMessage(hour);
  if (late) return late;

  const notes = milestoneFor(noteCount, NOTE_MILESTONES);
  const todos = milestoneFor(todoCount, TODO_MILESTONES);

  if (notes && todos) {
    return notes.count >= todos.count ? notes.message : todos.message;
  }
  return notes?.message ?? todos?.message ?? null;
}

export function highWaterMark(value: string | undefined, current: number): number {
  const stored = Number(value ?? 0);
  const safeStored = Number.isFinite(stored) && stored > 0 ? stored : 0;
  return Math.max(safeStored, current);
}