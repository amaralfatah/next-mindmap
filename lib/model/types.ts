export const SCHEMA_VERSION = 1 as const;

export type Side = "left" | "right";

export const branchColors = ["teal", "clay", "ochre", "indigo", "moss", "plum", "rose", "slate"] as const;
export type BranchColor = (typeof branchColors)[number];

export function isBranchColor(value: unknown): value is BranchColor {
  return typeof value === "string" && (branchColors as readonly string[]).includes(value);
}

export function isValidNodeColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (isBranchColor(value)) return true;
  return /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

/** A free-form connection between two nodes, drawn as a dashed line outside the tree. */
export type Relation = { id: string; from: string; to: string };

export type MindNode = {
  id: string;
  parentId: string | null;
  /** Order of children as drawn, top to bottom. */
  childIds: string[];
  text: string;
  note?: string;
  /** A branch color key. Unset means "inherit from the parent branch". */
  color?: BranchColor;
  /** Solid highlight behind the node, in a branch color or custom hex color. */
  fill?: BranchColor | string;
  /** Border color around the node, in a branch color or custom hex color. */
  border?: BranchColor | string;
  /** An http(s) URL opened from the node. */
  link?: string;
  collapsed?: boolean;
  bold?: boolean;
  italic?: boolean;
  /** Only meaningful for direct children of the root. */
  side?: Side;
};

export type MindMap = {
  id: string;
  /** Always equal to the root node's text; kept as a field so lists don't need to walk nodes. */
  title: string;
  rootId: string;
  nodes: Record<string, MindNode>;
  relations?: Relation[];
  createdAt: number;
  updatedAt: number;
  schemaVersion: typeof SCHEMA_VERSION;
};
