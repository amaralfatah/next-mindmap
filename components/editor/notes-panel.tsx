"use client";

import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { useEditor, useMap } from "@/lib/editor/store";
import { t } from "@/lib/i18n";

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

  return (
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
  );
}

export function NotesPanel() {
  const map = useMap();
  const open = useEditor((s) => s.notesOpen);
  const selectedId = useEditor((s) => s.selectedId);
  const setNotesOpen = useEditor((s) => s.setNotesOpen);
  const node = map?.nodes[selectedId];
  if (!open || !node) return null;

  return (
    <aside
      aria-label={t.editor.notesTitle}
      className="rise absolute z-30 flex flex-col border bg-background shadow-lg max-md:inset-x-0 max-md:bottom-0 max-md:h-[45dvh] max-md:rounded-t-2xl md:top-16 md:right-3 md:bottom-20 md:w-80 md:rounded-2xl"
    >
      <div className="flex items-start gap-2 border-b p-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{t.editor.notesTitle}</p>
          <p className="truncate font-display text-[15px] font-semibold">{node.text || "Untitled"}</p>
        </div>
        <IconButton label={t.editor.closeNotes} keys={["Esc"]} size="icon-sm" onClick={() => setNotesOpen(false)}>
          <XIcon />
        </IconButton>
      </div>
      <NoteEditor key={selectedId} nodeId={selectedId} stored={node.note ?? ""} />
    </aside>
  );
}
