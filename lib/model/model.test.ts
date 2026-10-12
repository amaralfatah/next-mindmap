import { describe, expect, it } from "vitest";
import {
  addChild,
  addRelation,
  addSibling,
  balanceSides,
  commit,
  createMap,
  deleteNode,
  depthOf,
  descendantCount,
  duplicateMap,
  effectiveColor,
  initHistory,
  isVisible,
  migrateMap,
  MapFormatError,
  moveNode,
  redo,
  removeRelation,
  renameMap,
  reveal,
  searchNodes,
  shiftNode,
  toggleCollapsed,
  treeOrder,
  undo,
  updateNode,
  HISTORY_LIMIT,
  type MindMap,
} from "./index";

function build() {
  let map = createMap("Trip");
  const a = addChild(map, map.rootId, "A");
  map = a.map;
  const b = addChild(map, map.rootId, "B");
  map = b.map;
  const a1 = addChild(map, a.id, "A1");
  map = a1.map;
  const a2 = addSibling(map, a1.id, "A2");
  map = a2.map;
  return { map, a: a.id, b: b.id, a1: a1.id, a2: a2.id };
}

describe("create and add", () => {
  it("creates a map whose title follows the root", () => {
    const map = createMap("  ");
    expect(map.title).toBe("Central idea");
    expect(map.nodes[map.rootId].parentId).toBeNull();
  });

  it("balances main branches left and right and gives each a color", () => {
    const { map, a, b } = build();
    expect(map.nodes[a].side).toBe("right");
    expect(map.nodes[b].side).toBe("left");
    expect(map.nodes[a].color).toBe("teal");
    expect(map.nodes[b].color).toBe("clay");
  });

  it("inherits color and side for deeper nodes", () => {
    const { map, a1 } = build();
    expect(map.nodes[a1].side).toBeUndefined();
    expect(effectiveColor(map, a1)).toBe("teal");
    expect(depthOf(map, a1)).toBe(2);
  });

  it("adds a sibling right after the node", () => {
    const { map, a, a1, a2 } = build();
    expect(map.nodes[a].childIds).toEqual([a1, a2]);
    const c = addSibling(map, a1, "between");
    expect(c.map.nodes[a].childIds).toEqual([a1, c.id, a2]);
  });

  it("adds a child when asked for a sibling of the root", () => {
    const { map } = build();
    const r = addSibling(map, map.rootId, "x");
    expect(r.map.nodes[r.id].parentId).toBe(map.rootId);
  });

  it("does not mutate the input map", () => {
    const { map, a } = build();
    const before = JSON.stringify(map);
    addChild(map, a, "x");
    updateNode(map, a, { text: "changed" });
    deleteNode(map, a);
    expect(JSON.stringify(map)).toBe(before);
  });
});

describe("update, collapse, delete", () => {
  it("drops cleared optional fields", () => {
    const { map, a } = build();
    const withNote = updateNode(map, a, { note: "n", bold: true });
    const cleared = updateNode(withNote, a, { note: "", bold: false });
    expect(cleared.nodes[a]).not.toHaveProperty("note");
    expect(cleared.nodes[a]).not.toHaveProperty("bold");
  });

  it("renaming the root renames the map", () => {
    const { map } = build();
    expect(updateNode(map, map.rootId, { text: "Holiday" }).title).toBe("Holiday");
    expect(renameMap(map, "Plan").nodes[map.rootId].text).toBe("Plan");
  });

  it("collapses and reveals", () => {
    const { map, a, a1 } = build();
    const collapsed = toggleCollapsed(map, a);
    expect(isVisible(collapsed, a1)).toBe(false);
    expect(isVisible(reveal(collapsed, a1), a1)).toBe(true);
    expect(toggleCollapsed(map, map.rootId)).toBe(map);
  });

  it("deletes a subtree and picks the next focus", () => {
    const { map, a, a1, a2 } = build();
    const r = deleteNode(map, a1);
    expect(r.map.nodes[a1]).toBeUndefined();
    expect(r.focusId).toBe(a2);
    const whole = deleteNode(map, a);
    expect(whole.map.nodes[a2]).toBeUndefined();
    expect(descendantCount(whole.map, map.rootId)).toBe(1);
  });

  it("refuses to delete the root", () => {
    const { map } = build();
    expect(deleteNode(map, map.rootId).map).toBe(map);
  });
});

describe("move", () => {
  it("moves a node under a new parent at an index", () => {
    const { map, b, a1 } = build();
    const moved = moveNode(map, a1, b, 0);
    expect(moved.nodes[b].childIds).toEqual([a1]);
    expect(moved.nodes[a1].parentId).toBe(b);
    expect(effectiveColor(moved, a1)).toBe("clay");
  });

  it("refuses to move into its own subtree", () => {
    const { map, a, a1 } = build();
    expect(moveNode(map, a, a1)).toBe(map);
  });

  it("promotes a deep node to a main branch with side and color", () => {
    const { map, a1 } = build();
    const moved = moveNode(map, a1, map.rootId, undefined, "left");
    expect(moved.nodes[a1].side).toBe("left");
    expect(moved.nodes[a1].color).toBe("teal");
  });

  it("a main branch moved deeper drops its side and color", () => {
    const { map, a, b } = build();
    const moved = moveNode(map, b, a);
    expect(moved.nodes[b].side).toBeUndefined();
    expect(effectiveColor(moved, b)).toBe("teal");
  });

  it("shifts among siblings", () => {
    const { map, a, a1, a2 } = build();
    expect(shiftNode(map, a2, -1).nodes[a].childIds).toEqual([a2, a1]);
    expect(shiftNode(map, a1, -1)).toBe(map);
  });
});

describe("search and order", () => {
  it("finds nodes by text or note, in tree order", () => {
    const r = build();
    const map = updateNode(r.map, r.b, { note: "remember a" });
    // Root "Trip" has no "a"; A, A1, A2 match by text; B matches by note.
    expect(searchNodes(map, "a")).toEqual([r.a, r.a1, r.a2, r.b]);
    expect(treeOrder(map)).toEqual([map.rootId, r.a, r.a1, r.a2, r.b]);
    expect(searchNodes(map, "  ")).toEqual([]);
  });

  it("duplicates with a new id and title", () => {
    const { map } = build();
    const copy = duplicateMap(map, "Trip (copy)");
    expect(copy.id).not.toBe(map.id);
    expect(copy.title).toBe("Trip (copy)");
    expect(Object.keys(copy.nodes)).toEqual(Object.keys(map.nodes));
  });
});

describe("history", () => {
  it("undoes and redoes snapshots", () => {
    const { map, a } = build();
    let h = initHistory({ map, selectedId: map.rootId });
    const next = updateNode(map, a, { text: "A!" });
    h = commit(h, { map: next, selectedId: a });
    h = undo(h);
    expect(h.present.map).toBe(map);
    h = redo(h);
    expect(h.present.map).toBe(next);
    expect(redo(h)).toBe(h);
  });

  it("caps the number of steps", () => {
    let map = createMap();
    let h = initHistory({ map, selectedId: map.rootId });
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      map = addChild(map, map.rootId, String(i)).map;
      h = commit(h, { map, selectedId: map.rootId });
    }
    expect(h.past.length).toBe(HISTORY_LIMIT);
  });

  it("a new commit clears redo", () => {
    const { map, a } = build();
    let h = initHistory({ map, selectedId: a });
    h = commit(h, { map: updateNode(map, a, { text: "1" }), selectedId: a });
    h = undo(h);
    h = commit(h, { map: updateNode(map, a, { text: "2" }), selectedId: a });
    expect(h.future).toEqual([]);
  });
});

describe("migrateMap", () => {
  it("accepts a valid map and returns an equal copy", () => {
    const { map } = build();
    const parsed = migrateMap(JSON.parse(JSON.stringify(map)));
    expect(parsed).toEqual(map);
  });

  it("rejects newer versions with a clear code", () => {
    const { map } = build();
    try {
      migrateMap({ ...map, schemaVersion: 99 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(MapFormatError);
      expect((e as MapFormatError).code).toBe("newer-version");
    }
  });

  it("rejects broken trees", () => {
    const { map, a, a1 } = build();
    const broken: MindMap = JSON.parse(JSON.stringify(map));
    broken.nodes[a1].parentId = map.rootId;
    expect(() => migrateMap(broken)).toThrow(MapFormatError);

    const orphan: MindMap = JSON.parse(JSON.stringify(map));
    orphan.nodes[a].childIds = [];
    expect(() => migrateMap(orphan)).toThrow(/not connected/);

    expect(() => migrateMap("nope")).toThrow(MapFormatError);
    expect(() => migrateMap({ ...map, schemaVersion: undefined })).toThrow(MapFormatError);
  });

  it("drops unknown fields and bad values", () => {
    const { map, a } = build();
    const raw = JSON.parse(JSON.stringify(map));
    raw.nodes[a].color = "neon";
    raw.nodes[a].evil = "<script>";
    const parsed = migrateMap(raw);
    expect(parsed.nodes[a].color).toBeUndefined();
    expect(parsed.nodes[a]).not.toHaveProperty("evil");
  });
});

describe("relations, fill and link", () => {
  function twoLeaves() {
    const map = createMap("Root");
    const a = addChild(map, map.rootId, "A");
    const b = addChild(a.map, map.rootId, "B");
    return { map: b.map, a: a.id, b: b.id };
  }

  it("adds one relation per pair and ignores self links", () => {
    const { map, a, b } = twoLeaves();
    const linked = addRelation(map, a, b);
    expect(linked.relations).toHaveLength(1);
    expect(addRelation(linked, b, a)).toBe(linked);
    expect(addRelation(linked, a, a)).toBe(linked);
    expect(removeRelation(linked, linked.relations![0].id).relations).toBeUndefined();
  });

  it("drops relations when a node is deleted", () => {
    const { map, a, b } = twoLeaves();
    const linked = addRelation(map, a, b);
    expect(deleteNode(linked, a).map.relations).toBeUndefined();
  });

  it("round-trips fill, border, link and relations and rejects unsafe values", () => {
    const { map, a, b } = twoLeaves();
    let m = updateNode(map, a, { fill: "#339af0", border: "#845ef7", link: "https://example.com/x" });
    m = addRelation(m, a, b);
    const parsed = migrateMap(JSON.parse(JSON.stringify(m)));
    expect(parsed.nodes[a].fill).toBe("#339af0");
    expect(parsed.nodes[a].border).toBe("#845ef7");
    expect(parsed.nodes[a].link).toBe("https://example.com/x");
    expect(parsed.relations).toHaveLength(1);

    const raw = JSON.parse(JSON.stringify(m));
    raw.nodes[a].link = "javascript:alert(1)";
    raw.nodes[a].fill = "hotpink";
    raw.nodes[a].border = "<script>";
    raw.relations.push({ id: "x", from: a, to: "missing" });
    const clean = migrateMap(raw);
    expect(clean.nodes[a].link).toBeUndefined();
    expect(clean.nodes[a].fill).toBeUndefined();
    expect(clean.nodes[a].border).toBeUndefined();
    expect(clean.relations).toHaveLength(1);
  });
});

describe("balanceSides", () => {
  it("balances main branches evenly between right and left sides", () => {
    let map = createMap("Root");
    const b1 = addChild(map, map.rootId, "B1", undefined, "right");
    map = b1.map;
    const b2 = addChild(map, map.rootId, "B2", undefined, "right");
    map = b2.map;
    const b3 = addChild(map, map.rootId, "B3", undefined, "right");
    map = b3.map;
    const b4 = addChild(map, map.rootId, "B4", undefined, "right");
    map = b4.map;

    // All currently on "right"
    const rootChildren = map.nodes[map.rootId].childIds;
    expect(rootChildren.every((id) => map.nodes[id].side === "right")).toBe(true);

    const balanced = balanceSides(map);
    const rightCount = rootChildren.filter((id) => balanced.nodes[id].side === "right").length;
    const leftCount = rootChildren.filter((id) => balanced.nodes[id].side === "left").length;

    expect(rightCount).toBe(2);
    expect(leftCount).toBe(2);
  });
});
