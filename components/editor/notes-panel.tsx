"use client";

import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { EmoticonPicker } from "./emoticon-picker";
import { useEditor, useMap } from "@/lib/editor/store";
import { useT } from "@/components/i18n-provider";
import { PLACEHOLDER } from "@/lib/layout";

function commitNote(nodeId: string, note: string) {
  const node = useEditor.getState().history?.present.map.nodes[nodeId];
  if (node && (node.note ?? "") !== note) useEditor.getState().patch({ note }, nodeId);
}

/**
 * Note editor for one node. Shows the stored note until the user types; typed text is a local
 * buffer written as one undo step on blur, or on unmount (switching node, closing the panel).
 * Undo/redo while the buffer is clean shows the restored note right away.
 */
function NoteEditor({ nodeId, stored }: { nodeId: string; stored: string }) {
  const t = useT();
  const [buffer, setBuffer] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const flush = () => {
    if (pending.current === null) return;
    const note = pending.current;
    pending.current = null;
    setBuffer(null);
    commitNote(nodeId, note);
  };
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(() => {
    area.current?.focus({ preventScroll: true });
    return () => flushRef.current();
  }, []);

  const handleInsertEmoticon = (char: string) => {
    const el = area.current;
    const current = buffer ?? stored;
    if (el) {
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const next = current.slice(0, start) + char + current.slice(end);
      pending.current = next;
      setBuffer(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + char.length, start + char.length);
      }, 0);
    } else {
      const next = current ? `${current} ${char}` : char;
      pending.current = next;
      setBuffer(next);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <textarea
        ref={area}
        value={buffer ?? stored}
        onChange={(e) => {
          pending.current = e.target.value;
          setBuffer(e.target.value);
        }}
        onBlur={flush}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            useEditor.getState().setNotesOpen(false);
          }
        }}
        placeholder={t.editor.notesPlaceholder}
        aria-label={t.editor.notesTitle}
        className="min-h-0 flex-1 resize-none bg-transparent p-3 text-base leading-relaxed outline-none placeholder:text-muted-foreground md:text-sm"
      />
      <div className="flex items-center justify-between border-t border-border/40 px-2 py-1 bg-muted/20">
        <EmoticonPicker
          onSelect={handleInsertEmoticon}
          side="top"
          align="start"
          className="size-7 text-muted-foreground hover:text-foreground [&_svg]:size-4"
        />
      </div>
    </div>
  );
}

export function NotesPanel() {
  const t = useT();
  const map = useMap();
  const open = useEditor((s) => s.notesOpen);
  const selectedId = useEditor((s) => s.selectedId);
  const setNotesOpen = useEditor((s) => s.setNotesOpen);
  const node = map?.nodes[selectedId];
  if (!open || !node) return null;

  return (
    <aside
      aria-label={t.editor.notesTitle}
      className="rise absolute z-30 flex flex-col border bg-card shadow-xl shadow-black/[0.06] max-md:inset-x-0 max-md:bottom-[var(--keyboard,0px)] max-md:h-[min(48dvh,calc(100dvh-var(--keyboard,0px)-4rem))] max-md:rounded-t-3xl md:top-16 md:right-3 md:bottom-20 md:w-80 md:rounded-3xl dark:shadow-black/30"
    >
      <div className="flex items-start gap-2 border-b p-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{t.editor.notesTitle}</p>
          <p className="truncate text-[15px] font-semibold">{node.text || PLACEHOLDER}</p>
        </div>
        <IconButton label={t.editor.closeNotes} keys={["Esc"]} size="icon-sm" onClick={() => setNotesOpen(false)}>
          <XIcon />
        </IconButton>
      </div>
      <NoteEditor key={selectedId} nodeId={selectedId} stored={node.note ?? ""} />
    </aside>
  );
}
