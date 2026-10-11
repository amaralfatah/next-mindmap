import { describe, expect, it } from "vitest";
import { approxTextWidth, layoutMap } from "@/lib/layout";
import { addChild, createMap, moveNode } from "@/lib/model";
import { findDrop } from "./drop";

function sample() {
  let map = createMap("Root");
  const a = addChild(map, map.rootId, "Alpha");
  map = a.map;
  const b = addChild(map, map.rootId, "Beta");
  map = b.map;
  const a1 = addChild(map, a.id, "One");
  map = a1.map;
  const a2 = addChild(map, a.id, "Two");
  map = a2.map;
  return { map, a: a.id, b: b.id, a1: a1.id, a2: a2.id };
}

describe("findDrop", () => {
  it("drops onto a node's middle as its last child", () => {
    const { map, b, a1 } = sample();
    const layout = layoutMap(map, approxTextWidth);
    const box = layout.boxes[b];
    const drop = findDrop(map, layout, a1, { x: box.x + 5, y: box.y + box.height / 2 });
    expect(drop).toMatchObject({ targetId: b, mode: "child", parentId: b, index: 0 });
  });

  it("drops near an edge as a sibling before or after", () => {
    const { map, a, a1, a2 } = sample();
    const layout = layoutMap(map, approxTextWidth);
    const box = layout.boxes[a1];
    const after = findDrop(map, layout, a2, { x: box.x + 5, y: box.y + box.height - 1 });
    expect(after).toMatchObject({ mode: "after", parentId: a, index: 1 });
    const before = findDrop(map, layout, a2, { x: box.x + 5, y: box.y + 1 });
    expect(before).toMatchObject({ mode: "before", parentId: a, index: 0 });
    const moved = moveNode(map, a2, before!.parentId, before!.index);
    expect(moved.nodes[a].childIds).toEqual([a2, a1]);
  });

  it("drops on the root with a side from the pointer", () => {
    const { map, a1 } = sample();
    const layout = layoutMap(map, approxTextWidth);
    const root = layout.boxes[map.rootId];
    expect(findDrop(map, layout, a1, { x: root.x + 2, y: 0 })?.side).toBe("left");
    expect(findDrop(map, layout, a1, { x: root.x + root.width - 2, y: 0 })?.side).toBe("right");
  });

  it("ignores the dragged branch and empty space", () => {
    const { map, a, a1 } = sample();
    const layout = layoutMap(map, approxTextWidth);
    const box = layout.boxes[a1];
    expect(findDrop(map, layout, a, { x: box.x + 5, y: box.y + box.height / 2 })).toBeNull();
    expect(findDrop(map, layout, a1, { x: 99999, y: 99999 })).toBeNull();
  });
});
