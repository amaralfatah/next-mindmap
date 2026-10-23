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
  /** "1" when this browser was last seen signed in; picks the first screen before the session loads. */
  signedIn: "signed-in",
} as const;
