"use client";

import { NodeToolbar as FlowToolbar, Position } from "@xyflow/react";
import {
  BoldIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  EllipsisIcon,
  ItalicIcon,
  Link2Icon,
  LinkIcon,
  SplineIcon,
  StickyNoteIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEditor } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import type { MindNode } from "@/lib/model";
import { cn } from "@/lib/utils";
import { removeSelected } from "./actions";
import { EmoticonPicker } from "./emoticon-picker";
import { NodeStylePicker } from "./node-style-picker";

const btn = "size-9 text-foreground/80 hover:text-foreground [&_svg]:size-[18px]";

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-border" />;
}

function TextStyle({ node }: { node: MindNode }) {
  const patch = useEditor((s) => s.patch);
  const toggle = "size-9 [&_svg]:size-[18px] aria-pressed:bg-accent";
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(btn, (node.bold || node.italic) && "text-foreground")}
            aria-label={t.editor.textStyle}
            title={t.editor.textStyle}
          />
        }
      >
        <TypeIcon />
      </PopoverTrigger>
      <PopoverContent side="top" className="flex w-auto gap-1 p-1">
        <Button
          variant="ghost"
          size="icon"
          className={toggle}
          aria-pressed={Boolean(node.bold)}
          aria-label={t.editor.bold}
          title={t.editor.bold}
          onClick={() => patch({ bold: !node.bold }, node.id)}
        >
          <BoldIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={toggle}
          aria-pressed={Boolean(node.italic)}
          aria-label={t.editor.italic}
          title={t.editor.italic}
          onClick={() => patch({ italic: !node.italic }, node.id)}
        >
          <ItalicIcon />
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function MoreMenu({ node }: { node: MindNode }) {
  const toggleCollapse = useEditor((s) => s.toggleCollapse);
  const isRoot = node.parentId === null;
  const canCollapse = !isRoot && node.childIds.length > 0;
  if (isRoot) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className={btn} aria-label={t.editor.more} title={t.editor.more} />}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-auto min-w-40">
        {canCollapse && (
          <DropdownMenuItem onClick={() => toggleCollapse(node.id)}>
            {node.collapsed ? <ChevronsUpDownIcon /> : <ChevronsDownUpIcon />}
            {node.collapsed ? t.editor.expand : t.editor.collapse}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={removeSelected}>
          <Trash2Icon />
          {t.editor.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className={cn(btn, node.link && "text-foreground")} aria-label={t.editor.link} title={t.editor.link} />
        }
      >
        <LinkIcon />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-72 p-2">
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
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** Quick actions floating above the selected node, in the spirit of a context toolbar. */
export function FloatingBar({ node, visible }: { node: MindNode; visible: boolean }) {
  const startConnect = useEditor((s) => s.startConnect);
  const notesOpen = useEditor((s) => s.notesOpen);
  const setNotesOpen = useEditor((s) => s.setNotesOpen);
  return (
    <FlowToolbar nodeId={node.id} isVisible={visible} position={Position.Top} offset={18}>
      <div
        role="toolbar"
        aria-label={t.editor.nodeActions}
        className="nodrag nopan max-sm:hidden flex items-center rounded-2xl border border-border/60 bg-background/80 p-1 shadow-lg shadow-black/[0.04] backdrop-blur-xl dark:shadow-black/20"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <NodeStylePicker node={node} />
        <TextStyle node={node} />
        <EmoticonPicker node={node} />
        <Divider />
        <LinkEditor node={node} />
        <Button variant="ghost" size="icon" className={btn} onClick={startConnect} aria-label={t.editor.connect} title={t.editor.connect}>
          <SplineIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(btn, notesOpen && "bg-accent")}
          aria-pressed={notesOpen}
          onClick={() => setNotesOpen(!notesOpen)}
          aria-label={t.editor.note}
          title={t.editor.note}
        >
          <StickyNoteIcon />
        </Button>
        {node.link && (
          <a
            href={node.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.editor.linkOpen}
            title={t.editor.linkOpen}
            className="grid size-9 place-items-center rounded-md text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Link2Icon className="size-[18px]" />
          </a>
        )}
        {node.parentId !== null && <Divider />}
        <MoreMenu node={node} />
      </div>
    </FlowToolbar>
  );
}
