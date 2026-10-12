import { nanoid } from "nanoid";
import {
  branchColors,
  SCHEMA_VERSION,
  type BranchColor,
  type MindMap,
  type MindNode,
  type Relation,
  type Side,
} from "./types";

/**
 * Pure operations on a MindMap. Every function returns a new map and never mutates its input,
 * so undo/redo can keep plain snapshots.
 */

export const DEFAULT_TITLE = "Central idea";

export function newId(): string {
  return nanoid(10);
}

export function createMap(title: string = DEFAULT_TITLE, now = Date.now()): MindMap {
  const rootId = newId();
  const text = title.trim() || DEFAULT_TITLE;
  return {
    id: newId(),
    title: text,
    rootId,
    nodes: { [rootId]: { id: rootId, parentId: null, childIds: [], text } },
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

function touch(map: MindMap, nodes: Record<string, MindNode>): MindMap {
  const root = nodes[map.rootId];
  return { ...map, nodes, title: root.text.trim() || DEFAULT_TITLE, updatedAt: Date.now() };
}

export function getNode(map: MindMap, id: string): MindNode {
  const node = map.nodes[id];
  if (!node) throw new Error(`Unknown node ${id}`);
  return node;
}

export function depthOf(map: MindMap, id: string): number {
  let depth = 0;
  let node = map.nodes[id];
  while (node?.parentId) {
    depth++;
    node = map.nodes[node.parentId];
  }
  return depth;
}

/** The ancestor that is a direct child of the root (the "main branch"), or null for the root. */
export function mainBranchOf(map: MindMap, id: string): MindNode | null {
  let node = map.nodes[id];
  if (!node || node.parentId === null) return null;
  while (node.parentId !== map.rootId) node = map.nodes[node.parentId!];
  return node;
}

export function sideOf(map: MindMap, id: string): Side | null {
  const branch = mainBranchOf(map, id);
  return branch ? (branch.side ?? "right") : null;
}

/** Nearest explicit color walking up from the node; null for the root. */
export function effectiveColor(map: MindMap, id: string): BranchColor | null {
  let node: MindNode | undefined = map.nodes[id];
  while (node && node.parentId !== null) {
    if (node.color) return node.color;
    node = map.nodes[node.parentId];
  }
  return null;
}

export function isAncestor(map: MindMap, ancestorId: string, id: string): boolean {
  let node = map.nodes[id];
  while (node?.parentId) {
    if (node.parentId === ancestorId) return true;
    node = map.nodes[node.parentId];
  }
  return false;
}

export function subtreeIds(map: MindMap, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    out.push(current);
    stack.push(...map.nodes[current].childIds);
  }
  return out;
}

/** Number of descendants, not counting the node itself. */
export function descendantCount(map: MindMap, id: string): number {
  return subtreeIds(map, id).length - 1;
}

export function nodeCount(map: MindMap): number {
  return Object.keys(map.nodes).length;
}

function nextBranchColor(map: MindMap): BranchColor {
  const counts = new Map<BranchColor, number>(branchColors.map((c) => [c, 0]));
  for (const id of map.nodes[map.rootId].childIds) {
    const c = map.nodes[id].color;
    if (c) counts.set(c, counts.get(c)! + 1);
  }
  // Least used color wins; ties go to palette order so the first branches look deliberate.
  let best: BranchColor = branchColors[0];
  for (const c of branchColors) if (counts.get(c)! < counts.get(best)!) best = c;
  return best;
}

function balancedSide(map: MindMap): Side {
  const children = map.nodes[map.rootId].childIds.map((id) => map.nodes[id]);
  const right = children.filter((n) => n.side !== "left").length;
  const left = children.length - right;
  return right <= left ? "right" : "left";
}

export type Created = { map: MindMap; id: string };

export function addChild(map: MindMap, parentId: string, text = "", index?: number, side?: Side): Created {
  const parent = getNode(map, parentId);
  const id = newId();
  const node: MindNode = { id, parentId, childIds: [], text };
  if (parentId === map.rootId) {
    node.side = side ?? balancedSide(map);
    node.color = nextBranchColor(map);
  }
  const childIds = [...parent.childIds];
  childIds.splice(index ?? childIds.length, 0, id);
  const opened: MindNode = { ...parent, childIds };
  delete opened.collapsed;
  return { map: touch(map, { ...map.nodes, [parentId]: opened, [id]: node }), id };
}

/** Adds a sibling right after `id`. On the root this adds a child instead. */
export function addSibling(map: MindMap, id: string, text = ""): Created {
  const node = getNode(map, id);
  if (node.parentId === null) return addChild(map, id, text);
  const parent = getNode(map, node.parentId);
  return addChild(map, parent.id, text, parent.childIds.indexOf(id) + 1, node.side);
}

export type NodePatch = Partial<
  Pick<MindNode, "text" | "note" | "color" | "fill" | "border" | "link" | "collapsed" | "bold" | "italic">
>;

export function updateNode(map: MindMap, id: string, patch: NodePatch): MindMap {
  const node = getNode(map, id);
  const next: MindNode = { ...node, ...patch };
  // Keep records tidy: drop optional keys that are cleared.
  for (const key of ["note", "color", "fill", "border", "link", "collapsed", "bold", "italic"] as const) {
    if (key in patch && (next[key] === undefined || next[key] === "" || next[key] === false)) delete next[key];
  }
  return touch(map, { ...map.nodes, [id]: next });
}

export function toggleCollapsed(map: MindMap, id: string): MindMap {
  const node = getNode(map, id);
  if (node.childIds.length === 0 || node.parentId === null) return map;
  return updateNode(map, id, { collapsed: !node.collapsed });
}

/**
 * Removes a node with its whole subtree. Returns the node that should receive focus next:
 * the next sibling, else the previous one, else the parent. The root cannot be deleted.
 */
export function deleteNode(map: MindMap, id: string): { map: MindMap; focusId: string } {
  const node = getNode(map, id);
  if (node.parentId === null) return { map, focusId: id };
  const parent = getNode(map, node.parentId);
  const index = parent.childIds.indexOf(id);
  const childIds = parent.childIds.filter((c) => c !== id);
  const nodes = { ...map.nodes, [parent.id]: { ...parent, childIds } };
  for (const removed of subtreeIds(map, id)) delete nodes[removed];
  // Under the root, prefer a neighbour on the same side.
  let focusId = childIds[index] ?? childIds[index - 1] ?? parent.id;
  if (parent.id === map.rootId) {
    const sameSide = childIds.filter((c) => (nodes[c].side ?? "right") === (node.side ?? "right"));
    const before = parent.childIds.slice(0, index).filter((c) => sameSide.includes(c));
    focusId = sameSide.find((c) => !before.includes(c)) ?? before.at(-1) ?? parent.id;
  }
  const relations = map.relations?.filter((r) => nodes[r.from] && nodes[r.to]);
  const next = touch(map, nodes);
  if (relations && relations.length !== map.relations?.length) {
    if (relations.length) next.relations = relations;
    else delete next.relations;
  }
  return { map: next, focusId };
}

/** Adds a relation unless one already links the pair (in either direction) or it would loop on itself. */
export function addRelation(map: MindMap, from: string, to: string): MindMap {
  if (from === to || !map.nodes[from] || !map.nodes[to]) return map;
  if (map.relations?.some((r) => (r.from === from && r.to === to) || (r.from === to && r.to === from))) return map;
  const relation: Relation = { id: newId(), from, to };
  return { ...map, relations: [...(map.relations ?? []), relation], updatedAt: Date.now() };
}

export function removeRelation(map: MindMap, id: string): MindMap {
  const relations = map.relations?.filter((r) => r.id !== id);
  if (!relations || relations.length === map.relations?.length) return map;
  const next: MindMap = { ...map, updatedAt: Date.now() };
  if (relations.length) next.relations = relations;
  else delete next.relations;
  return next;
}

export function canMove(map: MindMap, id: string, newParentId: string): boolean {
  if (id === map.rootId) return false;
  if (!map.nodes[id] || !map.nodes[newParentId]) return false;
  return id !== newParentId && !isAncestor(map, id, newParentId);
}

/**
 * Moves a node (with its subtree) under `newParentId` at `index`. `side` applies when the new
 * parent is the root. Index is interpreted against the parent's child list without the node.
 */
export function moveNode(map: MindMap, id: string, newParentId: string, index?: number, side?: Side): MindMap {
  if (!canMove(map, id, newParentId)) return map;
  const node = getNode(map, id);
  const oldParent = getNode(map, node.parentId!);
  const nodes = { ...map.nodes };
  nodes[oldParent.id] = { ...oldParent, childIds: oldParent.childIds.filter((c) => c !== id) };

  const target = nodes[newParentId];
  const childIds = [...target.childIds];
  const at = Math.max(0, Math.min(index ?? childIds.length, childIds.length));
  childIds.splice(at, 0, id);
  const opened: MindNode = { ...target, childIds };
  delete opened.collapsed;
  nodes[newParentId] = opened;

  const moved: MindNode = { ...node, parentId: newParentId };
  if (newParentId === map.rootId) {
    moved.side = side ?? node.side ?? balancedSide({ ...map, nodes });
    if (!moved.color) moved.color = effectiveColor(map, id) ?? nextBranchColor({ ...map, nodes });
  } else {
    delete moved.side;
    // A former main branch joins another branch: let it take that branch's color.
    if (oldParent.id === map.rootId) delete moved.color;
  }
  nodes[id] = moved;
  return touch(map, nodes);
}

/** Moves a node one step up or down among its siblings (same side for main branches). */
export function shiftNode(map: MindMap, id: string, delta: -1 | 1): MindMap {
  const node = getNode(map, id);
  if (node.parentId === null) return map;
  const parent = getNode(map, node.parentId);
  const peers =
    parent.id === map.rootId
      ? parent.childIds.filter((c) => (map.nodes[c].side ?? "right") === (node.side ?? "right"))
      : parent.childIds;
  const swapWith = peers[peers.indexOf(id) + delta];
  if (!swapWith) return map;
  const childIds = [...parent.childIds];
  const a = childIds.indexOf(id);
  const b = childIds.indexOf(swapWith);
  [childIds[a], childIds[b]] = [childIds[b], childIds[a]];
  return touch(map, { ...map.nodes, [parent.id]: { ...parent, childIds } });
}

/** Expands every collapsed ancestor so the node becomes visible. */
export function reveal(map: MindMap, id: string): MindMap {
  let node = map.nodes[id];
  let nodes: Record<string, MindNode> | null = null;
  while (node?.parentId) {
    const parent = (nodes ?? map.nodes)[node.parentId];
    if (parent.collapsed) {
      nodes ??= { ...map.nodes };
      const opened = { ...parent };
      delete opened.collapsed;
      nodes[parent.id] = opened;
    }
    node = parent;
  }
  return nodes ? { ...map, nodes } : map;
}

export function isVisible(map: MindMap, id: string): boolean {
  let node = map.nodes[id];
  while (node?.parentId) {
    const parent = map.nodes[node.parentId];
    if (parent.collapsed) return false;
    node = parent;
  }
  return Boolean(node);
}

export function renameMap(map: MindMap, title: string): MindMap {
  return updateNode(map, map.rootId, { text: title.trim() || DEFAULT_TITLE });
}

/** A copy with a fresh map id; node ids are local to a map so they can stay. */
export function duplicateMap(map: MindMap, title: string, now = Date.now()): MindMap {
  const renamed = renameMap(map, title);
  return { ...renamed, id: newId(), createdAt: now, updatedAt: now };
}

/** Depth-first ids: root, then right branches, then left branches. */
export function treeOrder(map: MindMap): string[] {
  const out: string[] = [];
  const visit = (id: string) => {
    out.push(id);
    for (const c of map.nodes[id].childIds) visit(c);
  };
  const root = map.nodes[map.rootId];
  out.push(root.id);
  const right = root.childIds.filter((c) => map.nodes[c].side !== "left");
  const left = root.childIds.filter((c) => map.nodes[c].side === "left");
  for (const c of [...right, ...left]) visit(c);
  return out;
}

/** Case-insensitive search over text and notes, in tree order. */
export function searchNodes(map: MindMap, query: string): string[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  return treeOrder(map).filter((id) => {
    const n = map.nodes[id];
    return n.text.toLocaleLowerCase().includes(q) || (n.note?.toLocaleLowerCase().includes(q) ?? false);
  });
}

/**
 * Distributes main branches (direct children of root) evenly between right and left sides.
 * Uses subtree size to balance visual weight across both sides.
 */
export function balanceSides(map: MindMap): MindMap {
  const root = map.nodes[map.rootId];
  if (!root || root.childIds.length === 0) return map;

  const children = root.childIds.map((id) => ({
    id,
    weight: subtreeIds(map, id).length,
  }));

  children.sort((a, b) => b.weight - a.weight);

  let rightWeight = 0;
  let leftWeight = 0;
  const assignments: Record<string, Side> = {};

  for (const { id, weight } of children) {
    if (rightWeight <= leftWeight) {
      assignments[id] = "right";
      rightWeight += weight;
    } else {
      assignments[id] = "left";
      leftWeight += weight;
    }
  }

  const updatedNodes = { ...map.nodes };
  let changed = false;

  for (const id of root.childIds) {
    const desiredSide = assignments[id];
    if (updatedNodes[id].side !== desiredSide) {
      updatedNodes[id] = { ...updatedNodes[id], side: desiredSide };
      changed = true;
    }
  }

  if (!changed) return map;
  return touch(map, updatedNodes);
}
