import type { MindMap } from "./types";

/** Snapshot undo stack. Maps are immutable, so a snapshot is just a reference. */

export const HISTORY_LIMIT = 100;

export type Entry = { map: MindMap; selectedId: string };

export type History = {
  past: Entry[];
  present: Entry;
  future: Entry[];
};

export function initHistory(present: Entry): History {
  return { past: [], present, future: [] };
}

export function commit(history: History, next: Entry): History {
  if (next.map === history.present.map) return { ...history, present: next };
  const past = [...history.past, history.present];
  if (past.length > HISTORY_LIMIT) past.splice(0, past.length - HISTORY_LIMIT);
  return { past, present: next, future: [] };
}

export function undo(history: History): History {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  const [next, ...future] = history.future;
  if (!next) return history;
  return { past: [...history.past, history.present], present: next, future };
}
