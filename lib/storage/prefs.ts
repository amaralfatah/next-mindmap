/**
 * Small per-browser preferences in localStorage. Every access is guarded: storage can be
 * missing or throw (private windows, blocked site data) and the app must still work.
 */

const PREFIX = "mindmap:";

export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, value);
  } catch {
    // Ignore: preferences are conveniences only.
  }
}

export const prefKeys = {
  lastExportAt: "last-export-at",
} as const;

export function readNumberPref(key: string): number | null {
  const raw = readPref(key);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function markExported(now = Date.now()): void {
  writePref(prefKeys.lastExportAt, String(now));
}
