import type { MindMap } from "@/lib/model";
import type { Layout } from "./layout";
import { isRoot } from "./metrics";

export type Direction = "up" | "down" | "left" | "right";

/**
 * Arrow-key navigation that follows what the user sees. Left/right move toward or away from
 * the root depending on the side; up/down jump to the nearest visible node in the same column.
 */
export function navigate(map: MindMap, layout: Layout, fromId: string, dir: Direction): string {
  const from = layout.boxes[fromId];
  if (!from) return map.rootId;
  const node = map.nodes[fromId];
  const centerY = (id: string) => layout.boxes[id].y + layout.boxes[id].height / 2;

  if (dir === "left" || dir === "right") {
    if (isRoot(from)) {
      const side = dir;
      const mains = node.childIds.filter((id) => (map.nodes[id].side ?? "right") === side && layout.boxes[id]);
      return closestTo(mains, 0, centerY) ?? fromId;
    }
    const outward = dir === from.side;
    if (!outward) return node.parentId!;
    if (node.collapsed) return fromId;
    const kids = node.childIds.filter((id) => layout.boxes[id]);
    return closestTo(kids, centerY(fromId), centerY) ?? fromId;
  }

  if (isRoot(from)) return fromId;
  // Same depth and side; nearest in the pressed direction.
  const candidates = Object.values(layout.boxes).filter(
    (b) => b.depth === from.depth && b.side === from.side && b.id !== fromId,
  );
  const y = centerY(fromId);
  let best: string | null = null;
  let bestDist = Infinity;
  for (const b of candidates) {
    const dy = b.y + b.height / 2 - y;
    if ((dir === "up" && dy >= 0) || (dir === "down" && dy <= 0)) continue;
    const dist = Math.abs(dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = b.id;
    }
  }
  return best ?? fromId;
}

function closestTo(ids: string[], y: number, centerY: (id: string) => number): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const id of ids) {
    const d = Math.abs(centerY(id) - y);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}
