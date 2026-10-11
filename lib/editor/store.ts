"use client";

import { create } from "zustand";
import {
  addChild,
  addRelation,
  addSibling,
  commit,
  deleteNode,
  initHistory,
  moveNode,
  redo as redoHistory,
  removeRelation,
  reveal,
  searchNodes,
  shiftNode,
  toggleCollapsed,
  undo as undoHistory,
  updateNode,
  type History,
  type MindMap,
  type NodePatch,
  type Side,
} from "@/lib/model";

/** `conflict`: another tab saved this map; `deleted`: it was removed. Both pause autosave. */
export type SaveState = "saved" | "saving" | "error" | "conflict" | "deleted";

type Search = { open: boolean; query: string; results: string[]; index: number };

type EditorState = {
  history: History | null;
  selectedId: string;
  /** Node whose text is being edited, and the live draft. */
  editingId: string | null;
  draft: string;
  /** True when editing began by typing a character: keep the caret at the end instead of selecting all. */
  seeded: boolean;
  /** Node just created by addChild/addSibling and not yet edited. */
  freshId: string | null;
  notesOpen: boolean;
  shortcutsOpen: boolean;
  /** Node a new relation will start from; the next node clicked becomes its end. */
  connectFrom: string | null;
  search: Search;
  saveState: SaveState;
  /** Bumped when the canvas should bring the selection into view. */
  focusTick: number;
  /** The map as it was read from storage; autosave skips it. */
  loadedMap: MindMap | null;
  /** Bumped by `overwrite()`; autosave then writes even over a newer or deleted copy. */
  overwriteTick: number;

  load(map: MindMap, opts?: { editRoot?: boolean }): void;
  /** Replace the map without an undo step (reload from another tab). */
  replace(map: MindMap): void;
  select(id: string): void;
  /** Clears the selection (click on empty canvas). Node actions do nothing until a node is selected. */
  deselect(): void;
  startEdit(id?: string, seed?: string): void;
  setDraft(text: string): void;
  commitEdit(): void;
  cancelEdit(): void;
  /** Esc while editing: keeps the text, except a brand-new node left empty is removed. */
  escapeEdit(): void;

  addChild(parentId?: string): void;
  addSibling(nodeId?: string): void;
  remove(): void;
  toggleCollapse(id?: string): void;
  patch(patch: NodePatch, id?: string): void;
  move(id: string, parentId: string, index?: number, side?: Side): void;
  shift(delta: -1 | 1): void;
  startConnect(): void;
  cancelConnect(): void;
  /** Ends a pending connection at `toId`. */
  finishConnect(toId: string): void;
  removeRelation(id: string): void;
  undo(): void;
  redo(): void;

  setNotesOpen(open: boolean): void;
  setShortcutsOpen(open: boolean): void;
  openSearch(): void;
  closeSearch(): void;
  setQuery(query: string): void;
  stepSearch(delta: 1 | -1): void;
  setSaveState(state: SaveState): void;
  overwrite(): void;
  requestFocus(): void;
};

const emptySearch: Search = { open: false, query: "", results: [], index: 0 };

export const useEditor = create<EditorState>()((set, get) => {
  /** Applies a change as one undo step. Editing in progress is committed first. */
  const apply = (fn: (map: MindMap, selectedId: string) => { map: MindMap; selectedId?: string }) => {
    if (get().editingId) get().commitEdit();
    const { history, selectedId } = get();
    if (!history) return;
    const result = fn(history.present.map, selectedId);
    const nextSelected = result.selectedId ?? selectedId;
    if (result.map === history.present.map && nextSelected === selectedId) return;
    // Record the selection before the change on the current entry so undo restores it.
    const base: History = { ...history, present: { ...history.present, selectedId } };
    set({
      history: commit(base, { map: result.map, selectedId: nextSelected }),
      selectedId: nextSelected,
      focusTick: get().focusTick + 1,
    });
    refreshSearch();
  };

  const refreshSearch = () => {
    const { search, history } = get();
    if (!search.open || !history) return;
    const results = searchNodes(history.present.map, search.query);
    set({ search: { ...search, results, index: Math.min(search.index, Math.max(0, results.length - 1)) } });
  };

  const map = () => get().history?.present.map;

  return {
    history: null,
    selectedId: "",
    editingId: null,
    draft: "",
    seeded: false,
    freshId: null,
    notesOpen: false,
    shortcutsOpen: false,
    connectFrom: null,
    search: emptySearch,
    saveState: "saved",
    focusTick: 0,
    loadedMap: null,
    overwriteTick: 0,

    load(m, opts) {
      set({
        loadedMap: m,
        history: initHistory({ map: m, selectedId: m.rootId }),
        selectedId: m.rootId,
        editingId: opts?.editRoot ? m.rootId : null,
        draft: opts?.editRoot ? m.nodes[m.rootId].text : "",
        seeded: false,
        notesOpen: false,
        connectFrom: null,
        search: emptySearch,
        saveState: "saved",
      });
    },

    replace(m) {
      const selectedId = m.nodes[get().selectedId] ? get().selectedId : m.rootId;
      set({ loadedMap: m, history: initHistory({ map: m, selectedId }), selectedId, editingId: null, saveState: "saved" });
    },

    select(id) {
      const m = map();
      if (!m?.nodes[id] || id === get().selectedId) {
        if (get().editingId && get().editingId !== id) get().commitEdit();
        return;
      }
      if (get().editingId) get().commitEdit();
      set({ selectedId: id, focusTick: get().focusTick + 1 });
    },

    deselect() {
      if (get().editingId) get().commitEdit();
      if (get().selectedId) set({ selectedId: "" });
    },

    startEdit(id, seed) {
      const m = map();
      const target = id ?? get().selectedId;
      if (!m?.nodes[target]) return;
      if (get().editingId && get().editingId !== target) get().commitEdit();
      set({ selectedId: target, editingId: target, draft: seed ?? m.nodes[target].text, seeded: seed !== undefined, freshId: null });
    },

    setDraft(text) {
      set({ draft: text });
    },

    commitEdit() {
      const { editingId, draft, freshId } = get();
      if (!editingId) return;
      set({ editingId: null, freshId: null });
      const m = map();
      if (!m?.nodes[editingId]) return;
      const text = draft.replace(/\s+$/g, "");
      // A brand-new node that was never given text is not kept.
      if (editingId === freshId && !text.trim()) {
        get().undo();
        return;
      }
      if (text === m.nodes[editingId].text) return;
      apply((current) => ({ map: updateNode(current, editingId, { text }), selectedId: editingId }));
    },

    cancelEdit() {
      set({ editingId: null, draft: "" });
    },

    escapeEdit() {
      const { editingId, freshId, draft } = get();
      if (editingId && editingId === freshId && !draft.trim()) {
        set({ editingId: null, draft: "", freshId: null });
        get().undo();
        return;
      }
      get().commitEdit();
    },

    addChild(parentId?: string) {
      let created = "";
      apply((m, sel) => {
        const target = parentId ?? sel;
        if (!m.nodes[target]) return { map: m };
        const r = addChild(m, target);
        created = r.id;
        return { map: r.map, selectedId: r.id };
      });
      if (created) set({ editingId: created, draft: "", freshId: created });
    },

    addSibling(nodeId?: string) {
      let created = "";
      apply((m, sel) => {
        const target = nodeId ?? sel;
        if (!m.nodes[target]) return { map: m };
        const r = addSibling(m, target);
        created = r.id;
        return { map: r.map, selectedId: r.id };
      });
      if (created) set({ editingId: created, draft: "", freshId: created });
    },

    remove() {
      apply((m, sel) => {
        if (!m.nodes[sel]) return { map: m };
        const r = deleteNode(m, sel);
        return { map: r.map, selectedId: r.focusId };
      });
    },

    toggleCollapse(id) {
      apply((m, sel) => ({ map: m.nodes[id ?? sel] ? toggleCollapsed(m, id ?? sel) : m }));
    },

    patch(p, id) {
      apply((m, sel) => ({ map: m.nodes[id ?? sel] ? updateNode(m, id ?? sel, p) : m }));
    },

    move(id, parentId, index, side) {
      apply((m) => ({ map: moveNode(m, id, parentId, index, side), selectedId: id }));
    },

    shift(delta) {
      apply((m, sel) => ({ map: m.nodes[sel] ? shiftNode(m, sel, delta) : m }));
    },

    startConnect() {
      if (get().editingId) get().commitEdit();
      set({ connectFrom: get().selectedId });
    },

    cancelConnect() {
      set({ connectFrom: null });
    },

    finishConnect(toId) {
      const from = get().connectFrom;
      set({ connectFrom: null });
      if (!from || from === toId) return;
      apply((m) => ({ map: addRelation(m, from, toId) }));
    },

    removeRelation(id) {
      apply((m) => ({ map: removeRelation(m, id) }));
    },

    undo() {
      if (get().editingId) {
        get().cancelEdit();
        return;
      }
      const h = get().history;
      if (!h?.past.length) return;
      const next = undoHistory(h);
      set({ history: next, selectedId: next.present.selectedId, focusTick: get().focusTick + 1 });
      refreshSearch();
    },

    redo() {
      const h = get().history;
      if (!h?.future.length) return;
      const next = redoHistory(h);
      set({ history: next, selectedId: next.present.selectedId, focusTick: get().focusTick + 1 });
      refreshSearch();
    },

    setNotesOpen(open) {
      if (get().editingId) get().commitEdit();
      set({ notesOpen: open });
    },

    setShortcutsOpen(open) {
      if (get().editingId) get().commitEdit();
      set({ shortcutsOpen: open });
    },

    openSearch() {
      if (get().editingId) get().commitEdit();
      set({ search: { ...get().search, open: true } });
      refreshSearch();
    },

    closeSearch() {
      set({ search: emptySearch });
    },

    setQuery(query) {
      const m = map();
      const results = m ? searchNodes(m, query) : [];
      set({ search: { open: true, query, results, index: 0 } });
      if (results[0]) revealAndSelect(results[0]);
    },

    stepSearch(delta) {
      const { search } = get();
      if (!search.results.length) return;
      const index = (search.index + delta + search.results.length) % search.results.length;
      set({ search: { ...search, index } });
      revealAndSelect(search.results[index]);
    },

    setSaveState(saveState) {
      set({ saveState });
    },

    overwrite() {
      set({ saveState: "saving", overwriteTick: get().overwriteTick + 1 });
    },

    requestFocus() {
      set({ focusTick: get().focusTick + 1 });
    },
  };

  /** Selects a node, expanding collapsed ancestors without adding an undo step. */
  function revealAndSelect(id: string) {
    const h = get().history;
    if (!h) return;
    const revealed = reveal(h.present.map, id);
    set({
      history: revealed === h.present.map ? h : { ...h, present: { ...h.present, map: revealed } },
      selectedId: id,
      focusTick: get().focusTick + 1,
    });
  }
});

export function useMap(): MindMap | null {
  return useEditor((s) => s.history?.present.map ?? null);
}
