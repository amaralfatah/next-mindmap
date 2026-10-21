import { isBranchColor, isValidNodeColor, SCHEMA_VERSION, type MindMap, type MindNode, type Relation } from "./types";
import { DEFAULT_TITLE } from "./ops";

export class MapFormatError extends Error {
  constructor(
    message: string,
    readonly code: "invalid" | "newer-version",
  ) {
    super(message);
    this.name = "MapFormatError";
  }
}

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/**
 * `migrations[n]` upgrades a version-n map to version n+1. Version 1 is the first format,
 * so the list is empty today; add entries here when the format changes.
 */
const migrations: Record<number, Migration> = {};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Turns untrusted data (IndexedDB record or imported file) into a valid current-version map,
 * or throws a MapFormatError. Never returns a partially valid map.
 */
export function migrateMap(input: unknown): MindMap {
  if (!isObject(input)) throw new MapFormatError("Not a Mind Map map.", "invalid");
  let raw = input;
  let version = raw.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new MapFormatError("Missing or invalid schemaVersion.", "invalid");
  }
  if (version > SCHEMA_VERSION) {
    throw new MapFormatError(
      `This map was saved by a newer version of Mind Map (format ${version}). Update the app to open it.`,
      "newer-version",
    );
  }
  while (version < SCHEMA_VERSION) {
    raw = migrations[version](raw);
    version++;
  }
  return validate(raw);
}

function validate(raw: Record<string, unknown>): MindMap {
  const fail = (why: string): never => {
    throw new MapFormatError(`Invalid map: ${why}.`, "invalid");
  };
  if (typeof raw.id !== "string" || !raw.id) fail("missing id");
  if (typeof raw.rootId !== "string") fail("missing rootId");
  if (!isObject(raw.nodes)) fail("missing nodes");

  const nodes: Record<string, MindNode> = {};
  for (const [key, value] of Object.entries(raw.nodes as Record<string, unknown>)) {
    if (!isObject(value)) fail(`node ${key} is not an object`);
    const n = value as Record<string, unknown>;
    if (n.id !== key) fail(`node ${key} has a mismatched id`);
    if (n.parentId !== null && typeof n.parentId !== "string") fail(`node ${key} has an invalid parentId`);
    if (!Array.isArray(n.childIds) || !n.childIds.every((c) => typeof c === "string")) {
      fail(`node ${key} has invalid childIds`);
    }
    if (typeof n.text !== "string") fail(`node ${key} has no text`);
    const node: MindNode = {
      id: key,
      parentId: n.parentId as string | null,
      childIds: [...(n.childIds as string[])],
      text: n.text as string,
    };
    if (typeof n.note === "string" && n.note) node.note = n.note;
    if (isBranchColor(n.color)) node.color = n.color;
    if (isValidNodeColor(n.fill)) node.fill = n.fill;
    if (isValidNodeColor(n.border)) node.border = n.border;
    if (typeof n.link === "string" && /^https?:\/\//i.test(n.link)) node.link = n.link;
    if (n.collapsed === true) node.collapsed = true;
    if (n.bold === true) node.bold = true;
    if (n.italic === true) node.italic = true;
    if (n.side === "left" || n.side === "right") node.side = n.side;
    nodes[key] = node;
  }

  const rootId = raw.rootId as string;
  const root = nodes[rootId];
  if (!root) fail("root node not found");
  if (root.parentId !== null) fail("root has a parent");

  // Every node must be reachable exactly once from the root, with consistent parent links.
  const seen = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) fail("node tree has a cycle or shared child");
    seen.add(id);
    for (const childId of nodes[id].childIds) {
      const child = nodes[childId];
      if (!child) fail(`child ${childId} not found`);
      if (child.parentId !== id) fail(`node ${childId} has an inconsistent parent`);
      stack.push(childId);
    }
  }
  if (seen.size !== Object.keys(nodes).length) fail("some nodes are not connected to the root");

  // Side only belongs to main branches.
  for (const node of Object.values(nodes)) {
    if (node.parentId === rootId) node.side ??= "right";
    else delete node.side;
  }

  const relations: Relation[] = [];
  if (Array.isArray(raw.relations)) {
    const pairs = new Set<string>();
    for (const r of raw.relations as unknown[]) {
      if (!isObject(r) || typeof r.id !== "string" || typeof r.from !== "string" || typeof r.to !== "string") continue;
      if (r.from === r.to || !nodes[r.from] || !nodes[r.to] || pairs.has(`${r.from}>${r.to}`)) continue;
      pairs.add(`${r.from}>${r.to}`);
      relations.push({ id: r.id, from: r.from, to: r.to });
    }
  }

  const now = Date.now();
  const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : now;
  return {
    id: raw.id as string,
    title: root.text.trim() || DEFAULT_TITLE,
    rootId,
    nodes,
    ...(relations.length ? { relations } : {}),
    createdAt,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : createdAt,
    schemaVersion: SCHEMA_VERSION,
  };
}
