"use client";

import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import { createCanvasTextWidth, layoutMap, type Layout, type TextWidth } from "@/lib/layout";
import { useEditor, useMap } from "./store";

function readFamily(variable: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || "system-ui, sans-serif";
}

/** Text measurer using the page's real fonts; rebuilt once web fonts have loaded. */
const buildMeasure = () =>
  createCanvasTextWidth((role) => readFamily(role === "root" ? "--font-display-face" : "--font-body"));

function useTextWidth(): TextWidth | null {
  // The editor only renders in the browser (it waits for IndexedDB), so the DOM is available.
  const [measure, setMeasure] = useState<TextWidth | null>(() =>
    typeof document === "undefined" ? null : buildMeasure(),
  );
  useEffect(() => {
    let alive = true;
    // Measure again once web fonts are ready; the first pass may have used a fallback font.
    document.fonts?.ready.then(() => {
      if (alive) setMeasure(() => buildMeasure());
    });
    return () => {
      alive = false;
    };
  }, []);
  return measure;
}

const LayoutContext = createContext<Layout | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const map = useMap();
  const editingId = useEditor((s) => s.editingId);
  const draft = useEditor((s) => s.draft);
  const measure = useTextWidth();
  const layout = useMemo(() => {
    if (!map || !measure) return null;
    return layoutMap(map, measure, editingId ? { [editingId]: draft } : {});
  }, [map, measure, editingId, draft]);
  return <LayoutContext value={layout}>{children}</LayoutContext>;
}

export function useLayout(): Layout | null {
  return use(LayoutContext);
}
