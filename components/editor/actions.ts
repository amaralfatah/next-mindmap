"use client";

import { toast } from "sonner";
import { useEditor } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import { descendantCount } from "@/lib/model";

/**
 * Deletes the selected node. Deleting a whole branch is easy to do by accident with one key,
 * so it says what went and offers Undo right there.
 */
export function removeSelected(): void {
  const s = useEditor.getState();
  const map = s.history?.present.map;
  const node = map?.nodes[s.selectedId];
  if (!map || !node || node.parentId === null) return;
  const hidden = descendantCount(map, node.id);
  s.remove();
  if (hidden === 0) return;
  toast(t.editor.deleted(node.text, hidden), {
    id: "deleted",
    action: { label: t.editor.undo, onClick: () => useEditor.getState().undo() },
  });
}
