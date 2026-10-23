"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n-provider";

/**
 * Runs before first paint so the saved / system theme never flashes.
 * See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
const script = `(function(){try{var t=localStorage.getItem("mindmap:theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);if(t){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute("content",d?"#000000":"#f5f5f7")})}}catch(e){}})()`;

const THEME_COLORS = { light: "#f5f5f7", dark: "#000000" };

/** The browser chrome follows the app's theme, not only the OS setting. */
function syncThemeColor(dark: boolean) {
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light));
}

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Current theme from the <html> class, kept in sync with the toggle. */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );
}

export function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  syncThemeColor(dark);
  try {
    localStorage.setItem("mindmap:theme", dark ? "dark" : "light");
  } catch {
    // Storage may be unavailable (private mode); the toggle still works for this visit.
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  // The pre-paint script can run before the theme-color tags exist; sync once mounted.
  useEffect(() => syncThemeColor(document.documentElement.classList.contains("dark")), []);
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t.editor.theme} title={t.editor.theme} className={className}>
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
}
