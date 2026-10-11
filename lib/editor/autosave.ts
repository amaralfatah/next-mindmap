"use client";

import { useEffect } from "react";
import { broadcast, loadMap, saveMap } from "@/lib/storage";
import type { MindMap } from "@/lib/model";
import { useEditor } from "./store";

const DEBOUNCE_MS = 500;
const RETRY_MS = 3000;

/**
 * Saves the open map 500 ms after the last change, and right away when the page is hidden.
 *
 * Before writing it checks the stored copy: if another tab saved since this tab last loaded or
 * saved (its `updatedAt` moved), or the map was deleted, nothing is written and the editor shows
 * a choice instead. `overwrite()` in the store forces the next write. Failed writes retry.
 */
export function useAutosave(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: MindMap | null = null;
    const initial = useEditor.getState().history?.present.map ?? null;
    let lastSaved: MindMap | null = initial;
    /** `updatedAt` of the copy this tab knows is on disk. */
    let base = initial?.updatedAt ?? 0;
    let force = false;
    let alive = true;

    const schedule = (ms: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), ms);
    };

    const flush = async () => {
      if (timer) clearTimeout(timer);
      timer = null;
      const map = pending;
      if (!map || map === lastSaved) return;
      pending = null;
      const { setSaveState } = useEditor.getState();
      try {
        const onDisk = await loadMap(map.id).catch(() => null);
        if (!force) {
          if (!onDisk) {
            pending ??= map;
            setSaveState("deleted");
            return;
          }
          if (onDisk.updatedAt !== base) {
            pending ??= map;
            setSaveState("conflict");
            return;
          }
        }
        force = false;
        await saveMap(map);
        base = map.updatedAt;
        lastSaved = map;
        broadcast({ type: "saved", mapId: map.id, updatedAt: map.updatedAt });
        if (!pending) setSaveState("saved");
      } catch {
        pending ??= map;
        setSaveState("error");
        if (alive) schedule(RETRY_MS);
      }
    };

    const unsubscribe = useEditor.subscribe((state, prev) => {
      // Freshly loaded from storage (open or reload): that copy is on disk.
      if (state.loadedMap !== prev.loadedMap && state.loadedMap) {
        pending = null;
        lastSaved = state.loadedMap;
        base = state.loadedMap.updatedAt;
        force = false;
        return;
      }
      const map = state.history?.present.map;
      if (state.overwriteTick !== prev.overwriteTick) {
        force = true;
        pending = map ?? pending;
        lastSaved = null;
        void flush();
        return;
      }
      if (!map || map === prev.history?.present.map) return;
      pending = map;
      if (state.saveState === "saved" || state.saveState === "error") useEditor.getState().setSaveState("saving");
      schedule(DEBOUNCE_MS);
    });

    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);

    return () => {
      alive = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      void flush();
    };
  }, []);
}
