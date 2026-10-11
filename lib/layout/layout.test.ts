import { describe, expect, it } from "vitest";
import { addChild, createMap, toggleCollapsed, updateNode } from "@/lib/model";
import { approxTextWidth, layoutMap, navigate, wrapText } from "./index";

function sample() {
  let map = createMap("Root");
  const ids: Record<string, string> = {};
  for (const name of ["R1", "L1", "R2", "L2"]) {
    const r = addChild(map, map.rootId, name);
    map = r.map;
    ids[name] = r.id;
  }
  for (const name of ["R1a", "R1b", "R1c"]) {
    const r = addChild(map, ids.R1, name);
    map = r.map;
    ids[name] = r.id;
  }
  return { map, ids };
}

const overlaps = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe("wrapText", () => {
  const w = (s: string) => s.length * 10;
  it("wraps on words and keeps explicit newlines", () => {
    expect(wrapText("aa bb cc", 50, w)).toEqual(["aa bb", "cc"]);
    expect(wrapText("one\ntwo", 500, w)).toEqual(["one", "two"]);
  });
  it("breaks words longer than a line", () => {
    expect(wrapText("abcdefghij", 40, w)).toEqual(["abcd", "efgh", "ij"]);
  });
  it("keeps empty paragraphs", () => {
    expect(wrapText("a\n\nb", 100, w)).toEqual(["a", "", "b"]);
  });
});

describe("layoutMap", () => {
  it("centers the root and puts branches on their sides", () => {
    const { map, ids } = sample();
    const { boxes } = layoutMap(map, approxTextWidth);
    const root = boxes[map.rootId];
    expect(root.x + root.width / 2).toBeCloseTo(0);
    expect(boxes[ids.R1].x).toBeGreaterThan(root.x + root.width);
    expect(boxes[ids.L1].x + boxes[ids.L1].width).toBeLessThan(root.x);
    expect(boxes[ids.R1a].x).toBeGreaterThan(boxes[ids.R1].x + boxes[ids.R1].width);
  });

  it("stacks siblings top to bottom without overlap", () => {
    const { map, ids } = sample();
    const { boxes } = layoutMap(map, approxTextWidth);
    expect(boxes[ids.R1a].y).toBeLessThan(boxes[ids.R1b].y);
    expect(boxes[ids.R1b].y).toBeLessThan(boxes[ids.R1c].y);
    const all = Object.values(boxes);
    for (const a of all) for (const b of all) if (a !== b) expect(overlaps(a, b)).toBe(false);
  });

  it("hides collapsed subtrees and reports hidden count", () => {
    const { map, ids } = sample();
    const collapsed = toggleCollapsed(map, ids.R1);
    const { boxes, edges } = layoutMap(collapsed, approxTextWidth);
    expect(boxes[ids.R1a]).toBeUndefined();
    expect(boxes[ids.R1].hidden).toBe(3);
    expect(edges.some((e) => e.target === ids.R1a)).toBe(false);
  });

  it("grows a node with a live text override", () => {
    const { map, ids } = sample();
    const before = layoutMap(map, approxTextWidth).boxes[ids.R1].width;
    const after = layoutMap(map, approxTextWidth, { [ids.R1]: "a much longer label" }).boxes[ids.R1].width;
    expect(after).toBeGreaterThan(before);
  });

  it("makes one edge per visible non-root node, colored by branch and offset at branch toggle", () => {
    const { map, ids } = sample();
    const { boxes, edges } = layoutMap(map, approxTextWidth);
    expect(edges).toHaveLength(7);
    const childEdge = edges.find((e) => e.target === ids.R1a);
    expect(childEdge?.color).toBe(map.nodes[ids.R1].color);
    // Edge path starts at R1's right edge + TOGGLE_OFFSET (14px)
    const expectedStartX = boxes[ids.R1].x + boxes[ids.R1].width + 14;
    expect(childEdge?.path.startsWith(`M${expectedStartX}`)).toBe(true);
  });

  it("reserves room for multi-line text and notes", () => {
    const { map, ids } = sample();
    const base = layoutMap(map, approxTextWidth).boxes[ids.R1a];
    const noted = layoutMap(updateNode(map, ids.R1a, { note: "x", text: "R1a\nmore" }), approxTextWidth).boxes[ids.R1a];
    expect(noted.height).toBeGreaterThan(base.height);
    expect(noted.width).toBeGreaterThan(base.width);
  });
});

describe("navigate", () => {
  it("moves outward, back, and between siblings visually", () => {
    const { map, ids } = sample();
    const layout = layoutMap(map, approxTextWidth);
    expect(navigate(map, layout, map.rootId, "right")).toBe(ids.R1);
    expect(navigate(map, layout, map.rootId, "left")).toBe(ids.L1);
    expect(navigate(map, layout, ids.R1, "right")).toBe(ids.R1b);
    expect(navigate(map, layout, ids.R1b, "left")).toBe(ids.R1);
    expect(navigate(map, layout, ids.L1, "right")).toBe(map.rootId);
    expect(navigate(map, layout, ids.R1a, "down")).toBe(ids.R1b);
    expect(navigate(map, layout, ids.R1a, "up")).toBe(ids.R1a);
    expect(navigate(map, layout, ids.R1, "down")).toBe(ids.R2);
  });
});
