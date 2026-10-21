"use client";

import { useEffect } from "react";
import { broadcast, MapGoneError, SaveConflictError, saveMap, UnauthorizedError } from "@/lib/storage";
import type { MindMap } from "@/lib/model";
import { useEditor } from "./store";

const DEBOUNCE_MS = 500;
const RETRY_MS = 3000;

/**
 * Saves the open map 500 ms after the last change, and right away when the page is hidden.
 *
 * Each write is conditional on the stored copy still being the one this tab last loaded or saved.
 * If another tab saved since, or the map was deleted, nothing is written and the editor shows a
 * choice instead. `overwrite()` in the store forces the next write. Failed writes retry.
 */
export function useAutosave(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
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

    // Writes run one at a time, so a save never races the previous one and trips its own conflict check.
    let chain: Promise<void> = Promise.resolve();
    const flush = () => (chain = chain.then(write));

    const write = async () => {
      if (timer) clearTimeout(timer);
      timer = null;
      const map = pending;
      if (!map || map === lastSaved) return;
      pending = null;
      const { setSaveState } = useEditor.getState();
      try {
        // One conditional request: the server refuses the write if another tab or device saved
        // since this tab's copy (`base`), or deleted the map. `overwrite()` drops the condition.
        await saveMap(map, force ? undefined : base);
        force = false;
        base = map.updatedAt;
        lastSaved = map;
        broadcast({ type: "saved", mapId: map.id, updatedAt: map.updatedAt });
        if (!pending) setSaveState("saved");
      } catch (err) {
        pending ??= map;
        if (err instanceof SaveConflictError) return setSaveState("conflict");
        if (err instanceof MapGoneError) return setSaveState("deleted");
        // Signed out (session expired, or signed out in another tab): keep retrying, so the
        // edits land as soon as the person signs in again.
        setSaveState(err instanceof UnauthorizedError ? "signedOut" : "error");
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
  }, [enabled]);
}
