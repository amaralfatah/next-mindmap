"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

/**
 * Runs before first paint so the saved / system theme never flashes.
 * See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
const script = `(function(){try{var t=localStorage.getItem("mindmap:theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);if(t){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",d?"#191918":"#f6f5f4")})}}catch(e){}})()`;

const STORAGE_KEY = "mindmap:theme";
const THEME_COLORS = { light: "#f6f5f4", dark: "#191918" };
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** "system" follows the OS, like Automatic in Apple's Appearance settings. */
export type ThemeMode = "light" | "dark" | "system";
export const themeModes: ThemeMode[] = ["light", "dark", "system"];

export const themeIcons = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const;

/** The browser chrome follows the app's theme; in system mode each tag keeps its own media query. */
function syncThemeColor(mode: ThemeMode) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    const dark = mode === "system" ? m.getAttribute("media") === DARK_QUERY : mode === "dark";
    m.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
  });
}

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

function readMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage may be unavailable (private mode); fall back to the system setting.
  }
  return "system";
}

function apply(mode: ThemeMode) {
  const dark = mode === "system" ? matchMedia(DARK_QUERY).matches : mode === "dark";
  document.documentElement.classList.toggle("dark", dark);
  syncThemeColor(mode);
}

const listeners = new Set<() => void>();

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The choice still applies for this visit.
  }
  apply(mode);
  listeners.forEach((l) => l());
}

function subscribeMode(onChange: () => void) {
  listeners.add(onChange);
  // In system mode the page follows the OS live, e.g. when macOS switches at sunset.
  const media = matchMedia(DARK_QUERY);
  const onSystem = () => {
    if (readMode() === "system") apply("system");
  };
  media.addEventListener("change", onSystem);
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onSystem);
  };
}

/** The person's appearance choice, which may differ from what is shown when it is "system". */
export function useThemeMode(): ThemeMode {
  const mode = useSyncExternalStore(subscribeMode, readMode, () => "system" as const);
  // The pre-paint script can run before the theme-color tags exist; sync once mounted.
  useEffect(() => syncThemeColor(readMode()), []);
  return mode;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Current theme from the <html> class, kept in sync with the appearance menu. */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

/** Mounted once in the layout so every page follows the system appearance live. */
export function ThemeWatcher() {
  useThemeMode();
  return null;
}
