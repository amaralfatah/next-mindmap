"use client";

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  type NodeMouseHandler,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findDrop, type Drop } from "@/lib/editor/drop";
import { useLayout } from "@/lib/editor/layout-context";
import { useEditor, useMap } from "@/lib/editor/store";
import { t } from "@/lib/i18n";
import { isRoot, relationPath } from "@/lib/layout";
import { subtreeIds } from "@/lib/model";
import { cn } from "@/lib/utils";
import { MindEdgeComponent, type MindFlowEdge } from "./mind-edge";
import { MindNodeComponent, type MindFlowNode, type MindNodeData } from "./mind-node";

const nodeTypes = { mind: MindNodeComponent };
const edgeTypes = { mind: MindEdgeComponent };

type DragState = { id: string; x: number; y: number; drop: Drop | null };

function sameData(a: MindNodeData, b: MindNodeData): boolean {
  return (
    a.node === b.node &&
    a.selected === b.selected &&
    a.editing === b.editing &&
    a.match === b.match &&
    a.drop === b.drop &&
    a.dimmed === b.dimmed &&
    a.connecting === b.connecting &&
    a.dragging === b.dragging &&
    a.box.x === b.box.x &&
    a.box.y === b.box.y &&
    a.box.width === b.box.width &&
    a.box.height === b.box.height &&
    a.box.color === b.box.color &&
    a.box.hidden === b.box.hidden &&
    a.box.side === b.box.side &&
    a.box.lines.join("\n") === b.box.lines.join("\n")
  );
}

function pointerOf(event: MouseEvent | TouchEvent): { x: number; y: number } {
  if ("touches" in event) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: event.clientX, y: event.clientY };
}

export function Canvas() {
  const map = useMap();
  const layout = useLayout();
  const selectedId = useEditor((s) => s.selectedId);
  const editingId = useEditor((s) => s.editingId);
  const search = useEditor((s) => s.search);
  const focusTick = useEditor((s) => s.focusTick);
  const connectFrom = useEditor((s) => s.connectFrom);
  const { select, startEdit, move } = useEditor.getState();
  const flow = useReactFlow<MindFlowNode, MindFlowEdge>();
  const [drag, setDrag] = useState<DragState | null>(null);
  const dropRef = useRef<Drop | null>(null);
  const cache = useRef(new Map<string, MindFlowNode>());
  const container = useRef<HTMLDivElement>(null);

  const dimmedIds = useMemo(() => {
    if (!drag || !map) return null;
    return new Set(subtreeIds(map, drag.id));
  }, [drag, map]);

  // Reusing unchanged node objects keeps xyflow from re-rendering every node on each keystroke.
  // The cache is a render-time memo, not state, so reading it during render is intended.
  /* eslint-disable react-hooks/refs */
  const nodes = useMemo(() => {
    if (!map || !layout) return [];
    const matches = search.open ? new Set(search.results) : null;
    const current = search.open ? search.results[search.index] : undefined;
    const next = new Map<string, MindFlowNode>();
    const list: MindFlowNode[] = [];
    for (const box of Object.values(layout.boxes)) {
      const data: MindNodeData = {
        box,
        node: map.nodes[box.id],
        selected: box.id === selectedId,
        editing: box.id === editingId,
        match: current === box.id ? "current" : matches?.has(box.id) ? "match" : "none",
        drop: drag?.drop?.targetId === box.id ? drag.drop.mode : null,
        dimmed: Boolean(dimmedIds?.has(box.id) && box.id !== drag?.id),
        connecting: box.id === connectFrom,
        dragging: box.id === drag?.id,
      };
      const dragging = drag?.id === box.id;
      const position = dragging ? { x: drag.x, y: drag.y } : { x: box.x, y: box.y };
      const prev = cache.current.get(box.id);
      const node: MindFlowNode =
        prev && !dragging && prev.position.x === position.x && prev.position.y === position.y && sameData(prev.data, data)
          ? prev
          : {
              id: box.id,
              type: "mind",
              position,
              data,
              width: box.width,
              height: box.height,
              draggable: !isRoot(box) && box.id !== editingId,
              selectable: false,
              zIndex: dragging ? 10 : box.id === selectedId ? 6 : isRoot(box) ? 2 : 1,
            };
      next.set(box.id, node);
      list.push(node);
    }
    cache.current = next;
    return list;
  }, [map, layout, selectedId, editingId, search, drag, dimmedIds, connectFrom]);
  /* eslint-enable react-hooks/refs */

  const edges = useMemo<MindFlowEdge[]>(() => {
    if (!layout) return [];
    const tree: MindFlowEdge[] = layout.edges
      .filter((e) => e.target !== drag?.id)
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "mind",
        selectable: false,
        focusable: false,
        data: { path: e.path, color: e.color, width: e.width, dimmed: Boolean(dimmedIds?.has(e.target)) },
      }));
    // Relations skip nodes hidden by a collapsed branch and follow the node being dragged.
    const relations: MindFlowEdge[] = [];
    for (const r of map?.relations ?? []) {
      const from = layout.boxes[r.from];
      const to = layout.boxes[r.to];
      if (!from || !to || r.from === drag?.id || r.to === drag?.id) continue;
      relations.push({
        id: `rel-${r.id}`,
        source: r.from,
        target: r.to,
        type: "mind",
        selectable: false,
        focusable: false,
        zIndex: 5,
        data: {
          path: relationPath(from, to),
          color: null,
          width: 1.75,
          dimmed: Boolean(dimmedIds?.has(r.from) || dimmedIds?.has(r.to)),
          relationId: r.id,
        },
      });
    }
    return [...tree, ...relations];
  }, [layout, map, drag, dimmedIds]);

  // Keep the selected node on screen, panning only when it would be cut off.
  const lastTick = useRef(-1);
  useEffect(() => {
    if (!layout || focusTick === lastTick.current) return;
    lastTick.current = focusTick;
    const box = layout.boxes[selectedId];
    const el = container.current;
    if (!box || !el) return;
    const { x, y, zoom } = flow.getViewport();
    const margin = 72;
    const left = box.x * zoom + x;
    const top = box.y * zoom + y;
    const right = (box.x + box.width) * zoom + x;
    const bottom = (box.y + box.height) * zoom + y;
    const { width, height } = el.getBoundingClientRect();
    if (left < margin || top < margin || right > width - margin || bottom > height - margin * 1.5) {
      void flow.setCenter(box.x + box.width / 2, box.y + box.height / 2, { zoom, duration: 100 });
    }
  }, [focusTick, layout, selectedId, flow]);

  const onNodeClick: NodeMouseHandler<MindFlowNode> = useCallback(
    (_, node) => {
      if (useEditor.getState().connectFrom) useEditor.getState().finishConnect(node.id);
      select(node.id);
    },
    [select],
  );
  const onNodeDoubleClick: NodeMouseHandler<MindFlowNode> = useCallback((_, node) => startEdit(node.id), [startEdit]);

  const onNodeDragStart: OnNodeDrag<MindFlowNode> = useCallback(
    (_, node) => {
      select(node.id);
      dropRef.current = null;
      setDrag({ id: node.id, x: node.position.x, y: node.position.y, drop: null });
    },
    [select],
  );

  const onNodeDrag: OnNodeDrag<MindFlowNode> = useCallback(
    (event, node) => {
      const currentMap = useEditor.getState().history?.present.map;
      if (!currentMap || !layout) return;
      const point = flow.screenToFlowPosition(pointerOf(event as unknown as MouseEvent | TouchEvent));
      const drop = findDrop(currentMap, layout, node.id, point);
      dropRef.current = drop;
      setDrag({ id: node.id, x: node.position.x, y: node.position.y, drop });
    },
    [flow, layout],
  );

  const onNodeDragStop: OnNodeDrag<MindFlowNode> = useCallback(
    (_, node) => {
      const d = dropRef.current;
      dropRef.current = null;
      setDrag(null);
      if (d) move(node.id, d.parentId, d.index, d.side);
    },
    [move],
  );

  useEffect(() => {
    const el = container.current;
    if (!el) return;

    // Accumulate wheel deltas and apply once per frame so fast wheels never queue extra renders.
    let pending = 0;
    let point = { x: 0, y: 0 };
    let frame = 0;

    const apply = () => {
      frame = 0;
      const { x, y, zoom } = flow.getViewport();
      const nextZoom = Math.min(2.5, Math.max(0.1, zoom * Math.pow(2, pending)));
      pending = 0;
      if (nextZoom === zoom) return;
      const rect = el.getBoundingClientRect();
      const mx = point.x - rect.left;
      const my = point.y - rect.top;
      const k = nextZoom / zoom;
      void flow.setViewport({ x: mx - (mx - x) * k, y: my - (my - y) * k, zoom: nextZoom });
    };

    const onWheel = (e: WheelEvent) => {
      // Ctrl / Meta wheel, or trackpad pinch (browsers send it as ctrl+wheel).
      if (!e.ctrlKey && !e.metaKey) return;
      // Capture phase + stop: otherwise xyflow's own d3 zoom also runs and the two fight.
      e.preventDefault();
      e.stopPropagation();
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 500 : 1;
      // Mouse wheel notches (~100px) need a stronger factor than pinch (small deltas).
      const gain = Math.abs(e.deltaY) >= 50 || e.deltaMode !== 0 ? 0.0026 : 0.01;
      pending += -e.deltaY * unit * gain;
      point = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    };

    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
      if (frame) cancelAnimationFrame(frame);
    };
  }, [flow]);

  if (!map || !layout) return <div className="dot-paper h-full w-full" aria-busy />;

  return (
    <div
      ref={container}
      className={cn("mind-canvas h-full w-full", !drag && "settled")}
      role="application"
      aria-label={t.editor.canvasLabel}
      aria-roledescription="mind map"
    >
      {connectFrom && (
        <p
          role="status"
          className="rise pointer-events-none absolute inset-x-3 top-16 z-20 mx-auto w-fit max-w-md rounded-xl bg-foreground/90 px-3.5 py-2 text-center text-sm text-background shadow-lg"
        >
          {t.editor.connecting}
        </p>
      )}
      <ReactFlow<MindFlowNode, MindFlowEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={() => {
          const s = useEditor.getState();
          if (s.connectFrom) s.cancelConnect();
          s.deselect();
        }}
        fitView
        fitViewOptions={{ maxZoom: 1, minZoom: 0.55, padding: 0.25 }}
        minZoom={0.1}
        maxZoom={2.5}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        disableKeyboardA11y
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        zoomActivationKeyCode={["Control", "Meta"]}
        panOnScroll
        panOnScrollSpeed={0.8}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        nodeDragThreshold={8}
        onlyRenderVisibleElements={Object.keys(layout.boxes).length > 400}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--dot)" />
      </ReactFlow>
    </div>
  );
}
