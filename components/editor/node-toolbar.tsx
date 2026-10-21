"use client";

import {
  BoldIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CornerDownRightIcon,
  ItalicIcon,
  Link2Icon,
  LinkIcon,
  ListPlusIcon,
  PaletteIcon,
  PencilIcon,
  SplineIcon,
  StickyNoteIcon,
  Trash2Icon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { IconButton } from "@/components/icon-button";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditor, useMap } from "@/lib/editor/store";
import { useT } from "@/components/i18n-provider";
import { branchColors, effectiveColor, type MindNode } from "@/lib/model";
import { cn } from "@/lib/utils";
import { removeSelected } from "./actions";
import { EmoticonPicker } from "./emoticon-picker";
import { NodeStylePicker } from "./node-style-picker";

/** Phones get a compact bar that fits 360px without scrolling; dividers and extras drop there. */
const touch = "max-sm:size-10 max-sm:min-w-10";

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border max-sm:hidden" />;
}

/** Accepts "example.com" as well as full URLs; only http(s) is kept. */
function normalizeLink(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(url).href;
  } catch {
    return undefined;
  }
}

function LinkEditor({ node }: { node: MindNode }) {
  const t = useT();
  const patch = useEditor((s) => s.patch);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(node.link ?? "");

  function save(e: FormEvent) {
    e.preventDefault();
    patch({ link: normalizeLink(draft) }, node.id);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(node.link ?? "");
        setOpen(next);
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t.editor.link}
                  aria-pressed={Boolean(node.link)}
                  className="aria-pressed:bg-accent max-sm:hidden"
                />
              }
            />
          }
        >
          <LinkIcon />
        </TooltipTrigger>
        <TooltipContent side="top">{t.editor.link}</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" className="w-80 p-2">
        <form onSubmit={save} className="flex items-center gap-1.5">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.editor.linkPlaceholder}
            aria-label={t.editor.link}
            inputMode="url"
            className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="sm">
            {t.editor.linkSave}
          </Button>
          {node.link && (
            <>
              <Button
                size="icon-sm"
                variant="ghost"
                nativeButton={false}
                aria-label={t.editor.linkOpen}
                title={t.editor.linkOpen}
                render={<a href={node.link} target="_blank" rel="noopener noreferrer" />}
              >
                <Link2Icon />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  patch({ link: undefined }, node.id);
                  setOpen(false);
                }}
              >
                {t.editor.linkRemove}
              </Button>
            </>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}

function ColorPicker({ nodeId }: { nodeId: string }) {
  const t = useT();
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
              render={<Button variant="ghost" size="icon" aria-label={t.editor.color} disabled={node.parentId === null} className={touch} />}
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
  const t = useT();
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
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto max-sm:gap-0 rounded-2xl border bg-card p-1.5 shadow-lg shadow-black/[0.05] [scrollbar-width:none] dark:shadow-black/25"
      >
        <IconButton
          label={t.editor.addChild}
          text={t.editor.childShort}
          keys={["Tab"]}
          side="top"
          onClick={() => s.addChild()}
          className="font-semibold text-ink max-sm:size-10 max-sm:min-w-10 max-sm:px-0 sm:h-9 sm:px-3 max-sm:[&>span]:hidden"
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
          className="font-semibold text-ink max-sm:size-10 max-sm:min-w-10 max-sm:px-0 sm:h-9 sm:px-3 max-sm:[&>span]:hidden"
        >
          <ListPlusIcon />
        </IconButton>
        <Divider />
        <IconButton label={t.editor.edit} keys={["F2"]} side="top" onClick={() => s.startEdit()} className={touch}>
          <PencilIcon />
        </IconButton>
        <Divider />
        <ColorPicker nodeId={selectedId} />
        <NodeStylePicker node={node} side="top" align="center" className={touch} />
        <EmoticonPicker node={node} side="top" align="center" className={touch} />
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
          className={`aria-pressed:bg-accent ${touch}`}
          onClick={() => s.setNotesOpen(!notesOpen)}
        >
          <StickyNoteIcon />
        </IconButton>
        <LinkEditor key={node.id} node={node} />
        <IconButton
          label={t.editor.connect}
          side="top"
          onClick={() => s.startConnect()}
          className="max-sm:hidden"
        >
          <SplineIcon />
        </IconButton>
        <IconButton
          label={node.collapsed ? t.editor.expand : t.editor.collapse}
          keys={["Space"]}
          side="top"
          onClick={() => s.toggleCollapse()}
          disabled={isRoot || !hasChildren}
          className="max-sm:hidden"
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
          className={`hover:bg-destructive/10 hover:text-destructive ${touch}`}
        >
          <Trash2Icon />
        </IconButton>
      </div>
    </div>
  );
}
