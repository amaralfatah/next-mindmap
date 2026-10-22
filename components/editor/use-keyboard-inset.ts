"use client";

import { useEffect } from "react";

/**
 * Publishes how much of the layout the on-screen keyboard covers as `--keyboard` on the root
 * element. iOS Safari overlays the keyboard instead of shrinking the page, so bottom sheets and
 * the map have to make room themselves. Android already resizes the layout, so it stays near 0.
 */
export function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty("--keyboard", `${inset}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--keyboard");
    };
  }, []);
}
