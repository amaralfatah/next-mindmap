"use client";

import { useEffect, useState } from "react";
import { createCanvasTextWidth, type TextWidth } from "@/lib/layout";

function readFamily(variable: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || "system-ui, sans-serif";
}

/** Text measurer using the page's real fonts; rebuilt once web fonts have loaded. */
const buildMeasure = () =>
  createCanvasTextWidth((role) => readFamily(role === "root" ? "--font-display-face" : "--font-body"));

export function useTextWidth(): TextWidth | null {
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
