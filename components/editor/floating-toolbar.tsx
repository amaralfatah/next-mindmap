"use client";

import { NodeToolbar as FlowToolbar, Position, useOnViewportChange, useReactFlow } from "@xyflow/react";
import { BoldIcon, ItalicIcon, SplineIcon, StickyNoteIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { IconButton } from "@/components/icon-button";
import { useT } from "@/components/i18n-provider";
import { useLayout } from "@/lib/editor/layout-context";
import { useEditor, useMap } from "@/lib/editor/store";
import { removeSelected } from "./actions";
import { EmoticonPicker } from "./emoticon-picker";
import { NodeStylePicker } from "./node-style-picker";
import { ColorPicker, LinkEditor } from "./node-toolbar";

/** Room the top bar and the toolbar itself need above a node before the toolbar flips below it. */
const FLIP_BELOW = 132;
/** Below a node the toolbar has to clear the add-sibling button. */
const OFFSET_ABOVE = 14;
const OFFSET_BELOW = 46;

const button = "size-8 min-w-8 [&_svg:not([class*='size-'])]:size-4";

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

/**
 * Desktop actions for the selected node, held just above it so the pointer never has to travel
 * to the edge of the screen. Steps aside while the map moves or a node is being typed into, and
 * leaves out what the node already offers itself (the + buttons and the collapse toggle).
 */
export function FloatingToolbar({ dragging }: { dragging: boolean }) {
  const t = useT();
  const map = useMap();
  const layout = useLayout();
  const flow = useReactFlow();
  const selectedId = useEditor((s) => s.selectedId);
  const editingId = useEditor((s) => s.editingId);
  const connectFrom = useEditor((s) => s.connectFrom);
  const notesOpen = useEditor((s) => s.notesOpen);
  const [moving, setMoving] = useState(false);
  // Re-read the node's screen position once the map settles, to decide above or below.
  const [, setSettled] = useState(0);
  useOnViewportChange({
    onStart: () => setMoving(true),
    onEnd: () => {
      setMoving(false);
      setSettled((n) => n + 1);
    },
  });

  const node = map?.nodes[selectedId];
  const box = layout?.boxes[selectedId];
  if (!map || !node || !box) return null;

  const visible = !moving && !dragging && !editingId && !connectFrom;
  const below = flow.flowToScreenPosition({ x: box.x, y: box.y }).y < FLIP_BELOW;
  const side = below ? "bottom" : "top";
  const isRoot = node.parentId === null;
  const s = useEditor.getState();

  return (
    <FlowToolbar
      nodeId={selectedId}
      isVisible={visible}
      position={below ? Position.Bottom : Position.Top}
      offset={below ? OFFSET_BELOW : OFFSET_ABOVE}
      className="max-sm:hidden"
    >
      <div
        key={selectedId}
        role="toolbar"
        aria-label={t.editor.nodeActions}
        className="nodrag nopan flex items-center gap-0.5 glass rounded-2xl border p-1 animate-in fade-in zoom-in-95 duration-120 ease-out"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {!isRoot && <ColorPicker nodeId={selectedId} side={side} className={button} />}
        <NodeStylePicker node={node} side={side} align="center" className={button} />
        <EmoticonPicker node={node} side={side} align="center" className={button} />
        <Divider />
        <IconButton
          label={t.editor.bold}
          keys={["Ctrl", "B"]}
          side={side}
          aria-pressed={Boolean(node.bold)}
          className={`aria-pressed:bg-accent ${button}`}
          onClick={() => s.patch({ bold: !node.bold })}
        >
          <BoldIcon />
        </IconButton>
        <IconButton
          label={t.editor.italic}
          keys={["Ctrl", "I"]}
          side={side}
          aria-pressed={Boolean(node.italic)}
          className={`aria-pressed:bg-accent ${button}`}
          onClick={() => s.patch({ italic: !node.italic })}
        >
          <ItalicIcon />
        </IconButton>
        <Divider />
        <IconButton
          label={t.editor.note}
          keys={["Ctrl", "."]}
          side={side}
          aria-pressed={notesOpen}
          className={`aria-pressed:bg-accent ${button}`}
          onClick={() => s.setNotesOpen(!notesOpen)}
        >
          <StickyNoteIcon />
        </IconButton>
        <LinkEditor key={node.id} node={node} side={side} className={button} />
        <IconButton label={t.editor.connect} side={side} onClick={() => s.startConnect()} className={button}>
          <SplineIcon />
        </IconButton>
        {!isRoot && (
          <>
            <Divider />
            <IconButton
              label={t.editor.delete}
              keys={["Del"]}
              side={side}
              onClick={removeSelected}
              className={`hover:bg-destructive/10 hover:text-destructive ${button}`}
            >
              <Trash2Icon />
            </IconButton>
          </>
        )}
      </div>
    </FlowToolbar>
  );
}
