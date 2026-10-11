"use client";

import {
  BoldIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CornerDownRightIcon,
  ItalicIcon,
  ListPlusIcon,
  PaletteIcon,
  PencilIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { IconButton } from "@/components/icon-button";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditor, useMap } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import { branchColors, effectiveColor } from "@/lib/model";
import { cn } from "@/lib/utils";
import { removeSelected } from "./actions";
import { NodeStylePicker } from "./node-style-picker";

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

function ColorPicker({ nodeId }: { nodeId: string }) {
  const map = useMap();
  const patch = useEditor((s) => s.patch);
  if (!map) return null;
  const node = map.nodes[nodeId];
  const current = effectiveColor(map, nodeId);
  const isMain = node.parentId === map.rootId;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={<Button variant="ghost" size="icon" aria-label={t.editor.color} disabled={node.parentId === null} className="max-sm:size-10" />}
            />
          }
        >
          <span className="relative">
            <PaletteIcon />
            <span
              aria-hidden
              className="absolute -right-1 -bottom-1 size-2 rounded-full ring-2 ring-background"
              style={{ background: current ? `var(--branch-${current})` : "var(--muted-foreground)" }}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{t.editor.color}</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" className="w-auto p-2">
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t.editor.color}>
          {!isMain && (
            <button
              type="button"
              role="radio"
              aria-checked={!node.color}
              onClick={() => patch({ color: undefined }, nodeId)}
              className={cn(
                "grid size-8 place-items-center rounded-full border border-dashed text-[10px] font-semibold text-muted-foreground transition-transform duration-140 ease-out active:scale-95 [@media(hover:hover)]:hover:scale-110",
                !node.color && "ring-2 ring-ink ring-offset-2 ring-offset-popover",
              )}
              title={t.editor.autoColor}
            >
              A
            </button>
          )}
          {branchColors.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={node.color === c}
              aria-label={c}
              title={c}
              onClick={() => patch({ color: c }, nodeId)}
              className={cn(
                "size-8 rounded-full transition-transform duration-140 ease-out active:scale-95 [@media(hover:hover)]:hover:scale-110",
                node.color === c && "ring-2 ring-ink ring-offset-2 ring-offset-popover",
              )}
              style={{ background: `var(--branch-${c})` }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Actions for the selected node. Primary input on phones; a discoverable cheat sheet on desktop. */
export function NodeToolbar() {
  const map = useMap();
  const selectedId = useEditor((s) => s.selectedId);
  const notesOpen = useEditor((s) => s.notesOpen);
  const s = useEditor.getState();
  if (!map || !map.nodes[selectedId]) return null;
  const node = map.nodes[selectedId];
  const isRoot = node.parentId === null;
  const hasChildren = node.childIds.length > 0;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4">
      <div
        role="toolbar"
        aria-label={t.editor.nodeActions}
        className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border bg-background/95 p-1 shadow-md [scrollbar-width:none]"
      >
        <IconButton
          label={t.editor.addChild}
          text={t.editor.childShort}
          keys={["Tab"]}
          side="top"
          onClick={() => s.addChild()}
          className="h-10 px-3 font-semibold text-ink sm:h-9"
        >
          <CornerDownRightIcon />
        </IconButton>
        <IconButton
          label={t.editor.addSibling}
          text={t.editor.siblingShort}
          keys={["Enter"]}
          side="top"
          onClick={() => s.addSibling()}
          disabled={isRoot}
          className="h-10 px-3 font-semibold text-ink sm:h-9"
        >
          <ListPlusIcon />
        </IconButton>
        <Divider />
        <IconButton label={t.editor.edit} keys={["F2"]} side="top" onClick={() => s.startEdit()} className="max-sm:size-10">
          <PencilIcon />
        </IconButton>
        <Divider />
        <ColorPicker nodeId={selectedId} />
        <NodeStylePicker node={node} side="top" align="center" className="max-sm:size-10" />
        <IconButton
          label={t.editor.bold}
          keys={["Ctrl", "B"]}
          side="top"
          aria-pressed={Boolean(node.bold)}
          className="aria-pressed:bg-accent max-sm:hidden"
          onClick={() => s.patch({ bold: !node.bold })}
        >
          <BoldIcon />
        </IconButton>
        <IconButton
          label={t.editor.italic}
          keys={["Ctrl", "I"]}
          side="top"
          aria-pressed={Boolean(node.italic)}
          className="aria-pressed:bg-accent max-sm:hidden"
          onClick={() => s.patch({ italic: !node.italic })}
        >
          <ItalicIcon />
        </IconButton>
        <IconButton
          label={t.editor.note}
          keys={["Ctrl", "."]}
          side="top"
          aria-pressed={notesOpen}
          className="aria-pressed:bg-accent max-sm:size-10"
          onClick={() => s.setNotesOpen(!notesOpen)}
        >
          <StickyNoteIcon />
        </IconButton>
        <IconButton
          label={node.collapsed ? t.editor.expand : t.editor.collapse}
          keys={["Space"]}
          side="top"
          onClick={() => s.toggleCollapse()}
          disabled={isRoot || !hasChildren}
          className="max-sm:size-10"
        >
          {node.collapsed ? <ChevronsUpDownIcon /> : <ChevronsDownUpIcon />}
        </IconButton>
        <Divider />
        <IconButton
          label={t.editor.delete}
          keys={["Del"]}
          side="top"
          onClick={removeSelected}
          disabled={isRoot}
          className="hover:bg-destructive/10 hover:text-destructive max-sm:size-10"
        >
          <Trash2Icon />
        </IconButton>
      </div>
    </div>
  );
}
