"use client";

import { useReactFlow } from "@xyflow/react";
import { useEffect } from "react";
import { useLayout } from "@/lib/editor/layout-context";
import { useEditor } from "@/lib/editor/store";
import { navigate, type Direction } from "@/lib/layout";
import { removeSelected } from "./actions";

const arrows: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]')) return true;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** All editor shortcuts, on the window so they work wherever focus sits on the page. */
export function useKeyboard(): void {
  const layout = useLayout();
  const flow = useReactFlow();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const s = useEditor.getState();
      const map = s.history?.present.map;
      if (!map || e.isComposing) return;
      // AltGr on Windows reports Ctrl+Alt; treat it as typing, not a shortcut.
      const mod = (e.ctrlKey || e.metaKey) && !e.altKey;
      const key = e.key;

      // Shortcuts that also work inside the search box and note panel.
      if (mod && key.toLowerCase() === "f") {
        e.preventDefault();
        s.openSearch();
        return;
      }
      if (isTypingTarget(e.target) || s.editingId) return;
      // Focused controls keep Tab (focus order) and Enter/Space (activation).
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("button,a,[role=button],[tabindex]:not(.react-flow__pane)") &&
        (key === "Tab" || key === "Enter" || key === " ")
      )
        return;

      const handled = () => e.preventDefault();

      // Nothing selected (clicked on empty canvas): arrows pick the root, other keys do nothing.
      if (!map.nodes[s.selectedId]) {
        if (!mod && !e.altKey && arrows[key]) {
          handled();
          s.select(map.rootId);
        }
        if (!mod) return;
      }

      if (mod) {
        const k = key.toLowerCase();
        if (k === "z" && !e.shiftKey) return handled(), s.undo();
        if ((k === "z" && e.shiftKey) || k === "y") return handled(), s.redo();
        if (k === "b") return handled(), s.patch({ bold: !map.nodes[s.selectedId]?.bold });
        if (k === "i") return handled(), s.patch({ italic: !map.nodes[s.selectedId]?.italic });
        if (k === ".") return handled(), s.setNotesOpen(!s.notesOpen);
        if (k === "/") return handled(), s.setShortcutsOpen(true);
        if (k === "0") return handled(), void flow.fitView({ padding: 0.2, duration: 180, maxZoom: 1.2 });
        if (k === "=" || k === "+") return handled(), void flow.zoomTo(Math.min(2.5, flow.getZoom() * 1.35), { duration: 100 });
        if (k === "-") return handled(), void flow.zoomTo(Math.max(0.1, flow.getZoom() / 1.35), { duration: 100 });
        if (key === "ArrowUp") return handled(), s.shift(-1);
        if (key === "ArrowDown") return handled(), s.shift(1);
        return;
      }
      if (e.altKey) return;

      switch (key) {
        case "Tab":
          handled();
          if (e.shiftKey) s.addSibling();
          else s.addChild();
          return;
        case "Enter":
          handled();
          if (e.shiftKey) s.startEdit();
          else s.addSibling();
          return;
        case "F2":
          handled();
          s.startEdit();
          return;
        case "Delete":
        case "Backspace":
          handled();
          removeSelected();
          return;
        case " ":
          handled();
          s.toggleCollapse();
          return;
        case "Escape":
          if (s.connectFrom) s.cancelConnect();
          else if (s.search.open) s.closeSearch();
          else if (s.notesOpen) s.setNotesOpen(false);
          else s.deselect();
          return;
      }

      const dir = arrows[key];
      if (dir) {
        handled();
        if (layout) s.select(navigate(map, layout, s.selectedId, dir));
        return;
      }

      // Any printable character starts editing and replaces the text, like a spreadsheet cell.
      if (key.length === 1 && !e.repeat) {
        handled();
        s.startEdit(undefined, key);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [layout, flow]);
}
