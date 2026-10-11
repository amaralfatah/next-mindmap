import { hierarchy, type HierarchyNode } from "d3-hierarchy";
import { effectiveColor, type BranchColor, type MindMap, type MindNode, type Side } from "@/lib/model";
import { edgeWidth, H_GAP, roleOf, TOGGLE_OFFSET, V_GAP } from "./metrics";
import { measureNode, type Measured, type TextWidth } from "./measure";

export type Box = {
  id: string;
  /** Top-left corner in canvas coordinates; the root is centered on (0, 0). */
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  side: Side | null;
  color: BranchColor | null;
  lines: string[];
  /** Number of hidden descendants when collapsed, else 0. */
  hidden: number;
  /** A highlighted leaf: drawn as a filled bubble instead of text on an underline. */
  boxed?: true;
};

export type Edge = {
  id: string;
  source: string;
  target: string;
  path: string;
  color: BranchColor | null;
  /** Stroke width; thicker near the root. */
  width: number;
};

export type Layout = {
  boxes: Record<string, Box>;
  edges: Edge[];
  bounds: { x: number; y: number; width: number; height: number };
};

type Datum = { node: MindNode; size: Measured };

/** Optional per-node text override, used to grow a node live while its text is being typed. */
export type Overrides = Record<string, string>;

/**
 * Classic two-sided mind map layout: main branches split left/right of the root, each subtree
 * owns a vertical band as tall as its children's bands stacked, and a parent is centered on
 * its band. Only visible (not collapsed away) nodes get a box.
 */
export function layoutMap(map: MindMap, textWidth: TextWidth, overrides: Overrides = {}): Layout {
  const boxes: Record<string, Box> = {};
  const edges: Edge[] = [];
  const sizeCache = new Map<string, Measured>();

  const size = (node: MindNode, depth: number) => {
    let s = sizeCache.get(node.id);
    if (!s) {
      const text = overrides[node.id];
      s = measureNode(text === undefined ? node : { ...node, text }, depth, textWidth);
      sizeCache.set(node.id, s);
    }
    return s;
  };

  const rootNode = map.nodes[map.rootId];
  const rootSize = size(rootNode, 0);
  boxes[rootNode.id] = {
    id: rootNode.id,
    x: -rootSize.width / 2,
    y: -rootSize.height / 2,
    width: rootSize.width,
    height: rootSize.height,
    depth: 0,
    side: null,
    color: null,
    lines: rootSize.lines,
    hidden: 0,
    ...(rootNode.fill || rootNode.border ? { boxed: true as const } : {}),
  };

  for (const side of ["right", "left"] as const) {
    const mains = rootNode.childIds.map((id) => map.nodes[id]).filter((n) => (n.side ?? "right") === side);
    if (mains.length === 0) continue;

    const tree = hierarchy<Datum>({ node: rootNode, size: rootSize }, (d) => {
      if (d.node.id === rootNode.id) return mains.map((n) => ({ node: n, size: size(n, 1) }));
      if (d.node.collapsed) return null;
      return d.node.childIds.map((id) => {
        const n = map.nodes[id];
        return { node: n, size: size(n, depthOfDatum(map, n)) };
      });
    });

    // Band height of every subtree, bottom-up.
    const band = new Map<HierarchyNode<Datum>, number>();
    tree.eachAfter((h) => {
      const own = h.data.size.height;
      if (!h.children?.length) return band.set(h, own);
      const gap = V_GAP[roleOf(h.depth + 1)];
      const stacked = h.children.reduce((sum, c) => sum + band.get(c)!, 0) + gap * (h.children.length - 1);
      band.set(h, h.depth === 0 ? stacked : Math.max(own, stacked));
    });

    // Positions, top-down. `cy` is each node's vertical center.
    const center = new Map<HierarchyNode<Datum>, number>([[tree, 0]]);
    tree.eachBefore((h) => {
      if (h.depth > 0) {
        const { width, height, lines } = h.data.size;
        const parent = boxes[h.parent!.data.node.id];
        const gap = H_GAP[roleOf(parent.depth)];
        const x = side === "right" ? parent.x + parent.width + gap : parent.x - gap - width;
        const cy = center.get(h)!;
        boxes[h.data.node.id] = {
          id: h.data.node.id,
          x,
          y: cy - height / 2,
          width,
          height,
          depth: h.depth,
          side,
          color: effectiveColor(map, h.data.node.id),
          lines,
          hidden: h.data.node.collapsed ? countDescendants(map, h.data.node.id) : 0,
          ...(h.data.node.fill || h.data.node.border ? { boxed: true as const } : {}),
        };
      }
      if (!h.children?.length) return;
      const gap = V_GAP[roleOf(h.depth + 1)];
      let y = center.get(h)! - band.get(h)! / 2;
      if (h.depth > 0) {
        // A parent's band may be taller than its children's stack (tall parent); center the stack.
        const stacked = h.children.reduce((s, c) => s + band.get(c)!, 0) + gap * (h.children.length - 1);
        y = center.get(h)! - stacked / 2;
      }
      for (const c of h.children) {
        const b = band.get(c)!;
        center.set(c, y + b / 2);
        y += b + gap;
      }
    });

    tree.each((h) => {
      if (h.depth === 0) return;
      const source = boxes[h.parent!.data.node.id];
      const target = boxes[h.data.node.id];
      edges.push({
        id: `${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        path: edgePath(source, target, side, h.parent!.depth > 0 ? TOGGLE_OFFSET : 0),
        color: target.color,
        width: edgeWidth(h.depth),
      });
    });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of Object.values(boxes)) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { boxes, edges, bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
}

function depthOfDatum(map: MindMap, node: MindNode): number {
  let depth = 0;
  let n: MindNode | undefined = node;
  while (n?.parentId) {
    depth++;
    n = map.nodes[n.parentId];
  }
  return depth;
}

function countDescendants(map: MindMap, id: string): number {
  let count = 0;
  const stack = [...map.nodes[id].childIds];
  while (stack.length) {
    const n = map.nodes[stack.pop()!];
    count++;
    stack.push(...n.childIds);
  }
  return count;
}

/**
 * Where an edge leaves a parent and enters a child. Boxed nodes (root, main branches) connect
 * at their side's middle; leaf nodes sit on an underline, so edges meet the underline's end.
 */
function anchor(box: Box, side: Side, role: "out" | "in"): { x: number; y: number } {
  const far = (side === "right") === (role === "out");
  const x = far ? box.x + box.width : box.x;
  if (!box.boxed) return { x, y: box.y + box.height };
  return { x, y: box.y + box.height / 2 };
}

/** A leaf sits on an underline; drawing it as the tail of its edge makes one unbroken stroke. */
function underline(target: Box, side: Side): string {
  if (target.boxed) return "";
  return ` H${r(side === "right" ? target.x + target.width : target.x)}`;
}

export function edgePath(source: Box, target: Box, side: Side, sourceStem = 0): string {
  const s = anchor(source, side, "out");
  const t = anchor(target, side, "in");
  const sx = side === "right" ? s.x + sourceStem : s.x - sourceStem;
  if (sourceStem > 0) {
    // Leaves the toggle vertically and arrives horizontally (a quarter ellipse), so siblings
    // share one trunk at the toggle and each bends into its own node.
    const k = 0.5523;
    return `M${r(sx)},${r(s.y)} C${r(sx)},${r(s.y + (t.y - s.y) * k)} ${r(sx + (t.x - sx) * (1 - k))},${r(t.y)} ${r(t.x)},${r(t.y)}${underline(target, side)}`;
  }
  const dx = (t.x - sx) * 0.5;
  return `M${r(sx)},${r(s.y)} C${r(sx + dx)},${r(s.y)} ${r(t.x - dx)},${r(t.y)} ${r(t.x)},${r(t.y)}${underline(target, side)}`;
}

/** A smooth curve between the facing sides of two boxes, for relations that cross the tree. */
export function relationPath(a: Box, b: Box): string {
  const ac = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const bc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const dx = bc.x - ac.x;
  const dy = bc.y - ac.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const sx = dx > 0 ? a.x + a.width : a.x;
    const tx = dx > 0 ? b.x : b.x + b.width;
    const mx = (tx - sx) / 2;
    return `M${r(sx)},${r(ac.y)} C${r(sx + mx)},${r(ac.y)} ${r(tx - mx)},${r(bc.y)} ${r(tx)},${r(bc.y)}`;
  }
  const sy = dy > 0 ? a.y + a.height : a.y;
  const ty = dy > 0 ? b.y : b.y + b.height;
  const my = (ty - sy) / 2;
  return `M${r(ac.x)},${r(sy)} C${r(ac.x)},${r(sy + my)} ${r(bc.x)},${r(ty - my)} ${r(bc.x)},${r(ty)}`;
}

const r = (n: number) => Math.round(n * 10) / 10;
