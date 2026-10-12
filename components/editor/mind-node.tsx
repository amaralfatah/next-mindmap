"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Link2Icon, PlusIcon, StickyNoteIcon } from "lucide-react";
import { memo, useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import type { DropMode } from "@/lib/editor/drop";
import { useEditor } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import { edgeWidth, isRoot, metrics, PLACEHOLDER, roleOf, type Box } from "@/lib/layout";
import { isBranchColor, type MindNode as Model } from "@/lib/model";
import { cn } from "@/lib/utils";
import { FloatingBar } from "./floating-bar";

export type MindNodeData = {
  box: Box;
  node: Model;
  selected: boolean;
  editing: boolean;
  match: "none" | "match" | "current";
  drop: DropMode | null;
  dimmed: boolean;
  /** This node is where a pending relation starts. */
  connecting: boolean;
  /** This node is being dragged, so its incoming edge (and the underline drawn with it) is hidden. */
  dragging: boolean;
};

export type MindFlowNode = Node<MindNodeData, "mind">;

export function branchVar(color: string | null): string {
  return color ? `var(--branch-${color})` : "var(--foreground)";
}

export function resolveNodeColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  if (isBranchColor(color)) return `var(--branch-${color})`;
  return color;
}

export function getContrastTextColor(fillColor: string | undefined): string | undefined {
  if (!fillColor) return undefined;
  if (isBranchColor(fillColor)) return "#ffffff";
  if (fillColor.startsWith("#")) {
    let hex = fillColor.slice(1);
    if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 170 ? "#1e293b" : "#ffffff";
    }
  }
  return "#ffffff";
}

function Editor({ box, node }: { box: Box; node: Model }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const draft = useEditor((s) => s.draft);
  const { setDraft, commitEdit, escapeEdit, addChild, addSibling } = useEditor.getState();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    // Started by typing a character: caret after it. F2 / double-click: select all to retype.
    if (useEditor.getState().seeded) el.setSelectionRange(el.value.length, el.value.length);
    else el.select();
  }, []);

  // Grow with content so wrapping never hides text while the layout catches up.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft, box.width]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    e.stopPropagation();
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      escapeEdit();
    } else if (e.key === "Tab") {
      e.preventDefault();
      commitEdit();
      if (e.shiftKey) addSibling();
      else addChild();
    }
  }

  return (
    <textarea
      ref={ref}
      value={draft}
      placeholder={PLACEHOLDER}
      aria-label={t.editor.edit}
      rows={1}
      spellCheck
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => commitEdit()}
      className={cn(
        "nodrag nopan nowheel block w-full resize-none overflow-hidden bg-transparent p-0 outline-none placeholder:text-current placeholder:opacity-40",
        node.italic && "italic",
      )}
      style={{ lineHeight: `${metrics[roleOf(box.depth)].lineHeight}px`, font: "inherit", fontStyle: node.italic ? "italic" : undefined }}
    />
  );
}

function Text({ box, node }: { box: Box; node: Model }) {
  if (!node.text) return <span className="opacity-40">{PLACEHOLDER}</span>;
  return (
    <>
      {box.lines.map((line, i) => (
        <span key={i} className="block whitespace-pre">
          {line || " "}
        </span>
      ))}
    </>
  );
}

function AddButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "nodrag nopan pointer-events-auto grid shrink-0 cursor-pointer place-items-center rounded-full bg-blue-500 text-white shadow-md transition-all duration-120 ease-out hover:scale-110 hover:bg-blue-600 focus:outline-none active:scale-95",
        "size-5",
        className,
      )}
    >
      <PlusIcon className="size-3.5 stroke-[2.5]" />
    </button>
  );
}

function Hint({ keys, label, flip }: { keys: string; label: string; flip: boolean }) {
  return (
    <span className={cn("flex h-5 items-center gap-1.5 whitespace-nowrap", flip && "flex-row-reverse")}>
      <kbd className="inline-flex items-center justify-center rounded border border-border/80 bg-muted/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground shadow-2xs">
        {keys}
      </kbd>
      <span>{label}</span>
    </span>
  );
}

function MindNodeView({ data }: NodeProps<MindFlowNode>) {
  const { box, node, selected, editing, match, drop, dimmed, connecting, dragging } = data;
  const m = metrics[roleOf(box.depth)];
  const color = branchVar(box.color);
  const toggleCollapse = useEditor((s) => s.toggleCollapse);
  const hasChildren = node.childIds.length > 0 && node.parentId !== null;
  const isBottomAnchored = !box.boxed;

  const content = (
    <div className="flex items-start" style={{ gap: 4 }}>
      <div className="min-w-0 flex-1">{editing ? <Editor box={box} node={node} /> : <Text box={box} node={node} />}</div>
      {node.link && !editing && (
        <a
          href={node.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t.editor.linkOpen}
          title={node.link}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          className="nodrag mt-[3px] shrink-0 opacity-60 transition-opacity hover:opacity-100"
        >
          <Link2Icon className="size-3.5" />
        </a>
      )}
      {node.note && !editing && (
        <StickyNoteIcon aria-label={t.editor.note} className="mt-[3px] size-3.5 shrink-0 opacity-55" />
      )}
    </div>
  );

  const fontStyle = {
    fontSize: m.fontSize,
    lineHeight: `${m.lineHeight}px`,
    fontWeight: node.bold ? 650 : m.fontWeight,
    fontStyle: node.italic ? "italic" : undefined,
    padding: `${m.padY}px ${m.padX}px`,
    width: box.width,
    minHeight: box.height,
  } as const;

  return (
    <div
      className={cn("mind-node group/node relative", dimmed && "opacity-35")}
      data-role={roleOf(box.depth)}
      data-selected={selected || undefined}
      style={{ ["--branch" as string]: color }}
    >
      <Handle type="target" position={box.side === "left" ? Position.Right : Position.Left} className="mind-handle" isConnectable={false} />
      <Handle type="source" position={box.side === "left" ? Position.Left : Position.Right} className="mind-handle" isConnectable={false} />

      <div
        className={cn(
          "relative text-foreground transition-colors duration-140 ease-out",
          box.boxed ? "rounded-lg" : "rounded-md",
          match === "match" && "bg-[color-mix(in_oklch,var(--branch-ochre)_30%,transparent)]",
          match === "current" && "bg-[color-mix(in_oklch,var(--branch-ochre)_55%,transparent)]",
          drop === "child" && "bg-accent outline-2 outline-dashed outline-ink",
          connecting && "ring-[2.5px] ring-[var(--branch-ochre)] ring-offset-2 ring-offset-background",
        )}
        style={{
          ...fontStyle,
          ...(node.fill
            ? { background: resolveNodeColor(node.fill), color: getContrastTextColor(node.fill) }
            : null),
          ...(node.border
            ? { border: `2px solid ${resolveNodeColor(node.border)}` }
            : node.fill
            ? { border: "2px solid transparent" }
            : null),
        }}
      >
        {content}
        {/* Other nodes get their underline from the incoming edge path, so the two are one stroke. */}
        {!box.boxed && (isRoot(box) || dragging) && (
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0",
              // The end facing the toggle butts against the stem; a round cap there leaves a notch.
              !hasChildren ? "rounded-full" : box.side === "left" ? "rounded-r-full" : "rounded-l-full",
            )}
            style={{ background: "var(--branch)", height: edgeWidth(box.depth), bottom: -edgeWidth(box.depth) / 2 }}
          />
        )}
      </div>

      {(drop === "before" || drop === "after") && (
        <span
          aria-hidden
          className={cn("absolute inset-x-0 h-[3px] rounded-full bg-ink", drop === "before" ? "-top-[7px]" : "-bottom-[8px]")}
        />
      )}

      {selected && !drop && !dimmed && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1.5 z-10 rounded-[14px] border-2 border-blue-500"
          />
          {!editing && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-[11px] -bottom-[11px] z-10 size-2.5 rounded-full border-2 border-blue-500 bg-white"
            />
          )}
        </>
      )}

      <FloatingBar node={node} visible={selected && !editing && !dimmed && !connecting} />

      {/* Sibling below: only for nodes with parent */}
      {selected && !editing && !drop && !dimmed && !connecting && node.parentId !== null && (
        <div className="absolute left-1/2 top-full z-30 mt-3.5 flex -translate-x-1/2 items-center">
          <AddButton label={t.editor.addSibling} onClick={() => useEditor.getState().addSibling(node.id)} />
        </div>
      )}

      {/* Child beside: for leaf nodes and root node */}
      {selected && !editing && !drop && !dimmed && !connecting && (node.childIds.length === 0 || node.parentId === null) && (
        <div
          className={cn(
            "group/add nodrag nopan pointer-events-auto absolute top-1/2 z-30 flex -translate-y-1/2 items-center gap-2 select-none animate-in fade-in duration-120",
            box.side === "left" ? "right-full mr-2 flex-row-reverse" : "left-full ml-2 flex-row",
          )}
        >
          <AddButton label={t.editor.addChild} onClick={() => useEditor.getState().addChild(node.id)} />
          {node.childIds.length === 0 && (
            <div
              aria-hidden
              className={cn("pointer-events-none flex flex-col gap-1.5 text-[11px] text-muted-foreground", box.side === "left" && "items-end")}
            >
              <Hint keys="Tab" label={t.editor.toCreateChild} flip={box.side === "left"} />
              {node.parentId !== null && <Hint keys="Enter" label={t.editor.toCreateSibling} flip={box.side === "left"} />}
            </div>
          )}
        </div>
      )}

      {hasChildren && (
        <>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute w-[14px]",
              box.side === "left" ? "right-full" : "left-full",
              isBottomAnchored ? "top-full" : "top-1/2 -translate-y-1/2",
            )}
            style={{
              background: "var(--branch)",
              height: edgeWidth(box.depth),
              ...(isBottomAnchored ? { marginTop: -edgeWidth(box.depth) / 2 } : null),
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(node.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={
              node.collapsed
                ? `${t.editor.expand}${box.hidden > 0 ? ` (${t.editor.hidden(box.hidden)})` : ""}`
                : t.editor.collapse
            }
            title={
              node.collapsed
                ? `${t.editor.expand}${box.hidden > 0 ? ` (${t.editor.hidden(box.hidden)})` : ""}`
                : t.editor.collapse
            }
            className={cn(
              "nodrag nopan pointer-events-auto absolute z-20 place-items-center rounded-full transition-transform duration-120 ease-out active:scale-95 [@media(hover:hover)]:hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring before:absolute before:-inset-2 before:content-['']",
              node.collapsed && box.hidden > 0
                ? "flex h-4 min-w-4 px-1 text-[10px] font-bold font-mono text-white shadow-xs"
                : "grid size-3.5 border-[2px] bg-background",
              box.side === "left"
                ? "right-[calc(100%+14px)] translate-x-1/2"
                : "left-[calc(100%+14px)] -translate-x-1/2",
              isBottomAnchored ? "top-full -translate-y-1/2" : "top-1/2 -translate-y-1/2",
            )}
            style={{
              borderColor: "var(--branch)",
              background: node.collapsed && box.hidden > 0 ? "var(--branch)" : undefined,
            }}
          >
            {node.collapsed && box.hidden > 0 ? (
              <span>+{box.hidden}</span>
            ) : node.collapsed ? (
              <span
                className="size-[5px] rounded-full"
                style={{ background: "var(--branch)" }}
              />
            ) : null}
          </button>
        </>
      )}
    </div>
  );
}

export const MindNodeComponent = memo(MindNodeView);
