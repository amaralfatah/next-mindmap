/**
 * Box metrics per node role. The canvas and the size measurer both read these, so a node
 * is drawn at the size it was measured.
 */

export type NodeRole = "root" | "topic";

export type RoleMetrics = {
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  padX: number;
  padY: number;
  minWidth: number;
  maxTextWidth: number;
};

export const metrics: Record<NodeRole, RoleMetrics> = {
  root: { fontSize: 16, lineHeight: 22, fontWeight: 650, padX: 8, padY: 5, minWidth: 48, maxTextWidth: 300 },
  topic: { fontSize: 14, lineHeight: 20, fontWeight: 450, padX: 6, padY: 5, minWidth: 40, maxTextWidth: 270 },
};

/** Width reserved inside a node for the note marker. */
export const NOTE_MARKER = 18;

/** Horizontal gap between a parent and its children, by the parent's role. */
export const H_GAP: Record<NodeRole, number> = { root: 64, topic: 36 };
/** Vertical gap between sibling subtrees, by the siblings' role. */
export const V_GAP: Record<NodeRole, number> = { root: 0, topic: 22 };

export const isRoot = (box: { depth: number }): boolean => box.depth === 0;

export function roleOf(depth: number): NodeRole {
  return depth === 0 ? "root" : "topic";
}

/** Horizontal distance from node anchor to the expand/collapse toggle button. */
export const TOGGLE_OFFSET = 14;

/** Shown (and measured) for a node with no text. Follows the UI language via `setPlaceholder`. */
export let PLACEHOLDER = "Untitled";

export function setPlaceholder(text: string): void {
  PLACEHOLDER = text;
}

/** Stroke width of the edge into a node at this depth. */
export const edgeWidth = (depth: number): number => (depth === 1 ? 3 : depth === 2 ? 2 : 1.5);
