import { subtreeIds, type MindMap, type Side } from "@/lib/model";
import type { Layout } from "@/lib/layout";

export type DropMode = "child" | "before" | "after";

export type Drop = {
  targetId: string;
  mode: DropMode;
  parentId: string;
  /** Index in the new parent's child list, counted without the dragged node. */
  index: number;
  side?: Side;
};

const SLOP = 10;

/**
 * Where a dragged node would land if released at `point` (canvas coordinates): onto a node's
 * middle makes it the last child, near the top or bottom edge puts it before or after that node.
 * Dropping on its own branch is not allowed.
 */
export function findDrop(map: MindMap, layout: Layout, dragId: string, point: { x: number; y: number }): Drop | null {
  const excluded = new Set(subtreeIds(map, dragId));
  let hit: Layout["boxes"][string] | null = null;
  for (const box of Object.values(layout.boxes)) {
    if (excluded.has(box.id)) continue;
    if (
      point.x >= box.x - SLOP &&
      point.x <= box.x + box.width + SLOP &&
      point.y >= box.y - SLOP &&
      point.y <= box.y + box.height + SLOP
    ) {
      // Prefer the smallest box when padded areas overlap.
      if (!hit || box.width * box.height < hit.width * hit.height) hit = box;
    }
  }
  if (!hit) return null;

  const target = map.nodes[hit.id];
  if (target.parentId === null) {
    const side: Side = point.x < hit.x + hit.width / 2 ? "left" : "right";
    const childIds = target.childIds.filter((id) => id !== dragId);
    return { targetId: hit.id, mode: "child", parentId: hit.id, index: childIds.length, side };
  }

  const rel = (point.y - hit.y) / hit.height;
  if (rel > 0.3 && rel < 0.7) {
    const childIds = target.childIds.filter((id) => id !== dragId);
    return { targetId: hit.id, mode: "child", parentId: hit.id, index: childIds.length };
  }
  const parent = map.nodes[target.parentId];
  const peers = parent.childIds.filter((id) => id !== dragId);
  const at = peers.indexOf(hit.id) + (rel >= 0.7 ? 1 : 0);
  return {
    targetId: hit.id,
    mode: rel >= 0.7 ? "after" : "before",
    parentId: parent.id,
    index: at,
    side: parent.parentId === null ? (target.side ?? "right") : undefined,
  };
}
