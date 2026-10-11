import { describe, expect, it } from "vitest";
import { approxTextWidth, layoutMap } from "@/lib/layout";
import { addChild, createMap, MapFormatError, toggleCollapsed, updateNode, type MindMap } from "@/lib/model";
import {
  exportBackupJson,
  exportMapJson,
  exportMarkdown,
  exportSvg,
  fileNameFor,
  importJson,
  importMarkdown,
  parseColor,
  toHex,
  type ExportPalette,
} from "./index";

function sample(): MindMap {
  let map = createMap("Launch plan");
  const a = addChild(map, map.rootId, "Research");
  map = a.map;
  const b = addChild(map, map.rootId, "Build");
  map = b.map;
  const a1 = addChild(map, a.id, "Interview 5 users");
  map = updateNode(a1.map, a1.id, { note: "Ask about pricing\nand onboarding", bold: true });
  const a2 = addChild(map, a1.id, "Line one\nline two");
  map = updateNode(a2.map, a2.id, { italic: true });
  map = addChild(map, b.id, "Prototype <fast> & cheap").map;
  return map;
}

/** Structure without ids: what an outline round trip should preserve. */
function shape(map: MindMap): unknown {
  const visit = (id: string): unknown => {
    const n = map.nodes[id];
    return { text: n.text, note: n.note, bold: n.bold, italic: n.italic, children: n.childIds.map(visit) };
  };
  return visit(map.rootId);
}

describe("JSON", () => {
  it("round-trips a map exactly, with a new id", () => {
    const map = sample();
    const [imported] = importJson(exportMapJson(map));
    expect(imported.id).not.toBe(map.id);
    expect({ ...imported, id: map.id }).toEqual(map);
  });

  it("imports a backup of several maps", () => {
    const maps = [sample(), createMap("Other")];
    const imported = importJson(exportBackupJson(maps));
    expect(imported.map((m) => m.title)).toEqual(["Launch plan", "Other"]);
  });

  it("rejects garbage and newer versions", () => {
    expect(() => importJson("{not json")).toThrow(MapFormatError);
    expect(() => importJson(JSON.stringify({ ...sample(), schemaVersion: 2 }))).toThrow(/newer version/);
    expect(() => importJson(JSON.stringify({ kind: "mindmap-backup", maps: [] }))).toThrow(MapFormatError);
  });
});

describe("Markdown", () => {
  it("exports headings, nested lists, notes and styles", () => {
    const md = exportMarkdown(sample());
    expect(md).toContain("# Launch plan");
    expect(md).toContain("## Research");
    expect(md).toContain("- **Interview 5 users**");
    expect(md).toContain("  > Ask about pricing");
    expect(md).toContain("  - *Line one<br>line two*");
  });

  it("round-trips Markdown -> map -> Markdown", () => {
    const md = exportMarkdown(sample());
    const again = exportMarkdown(importMarkdown(md));
    expect(again).toBe(md);
  });

  it("round-trips map -> Markdown -> map structure", () => {
    const map = sample();
    expect(shape(importMarkdown(exportMarkdown(map)))).toEqual(shape(map));
  });

  it("keeps Markdown-looking text literal through a round trip", () => {
    let map = createMap("C#");
    for (const text of ["*not italic*", "**not bold**", "[x] not a task", "a <br> b", "under_score", "# hash"]) {
      map = addChild(map, map.rootId, text).map;
    }
    const again = importMarkdown(exportMarkdown(map));
    expect(shape(again)).toEqual(shape(map));
  });

  it("handles AI-chat style outlines with mixed markers and skipped levels", () => {
    const md = [
      "Here is your plan:",
      "",
      "### Phase 1",
      "1. Define goals",
      "   * Revenue",
      "   * Users",
      "2. Pick stack",
      "",
      "### Phase 2",
      "- Ship it",
      "```",
      "- not an item",
      "```",
    ].join("\n");
    const map = importMarkdown(md, "My plan");
    const root = map.nodes[map.rootId];
    expect(root.text).toBe("My plan");
    const texts = root.childIds.map((id) => map.nodes[id].text);
    expect(texts).toEqual(["Here is your plan:", "Phase 1", "Phase 2"]);
    const phase1 = map.nodes[root.childIds[1]];
    expect(phase1.childIds.map((id) => map.nodes[id].text)).toEqual(["Define goals", "Pick stack"]);
    const goals = map.nodes[phase1.childIds[0]];
    expect(goals.childIds.map((id) => map.nodes[id].text)).toEqual(["Revenue", "Users"]);
    expect(Object.values(map.nodes).some((n) => n.text === "not an item")).toBe(false);
  });

  it("uses a single top heading as the root", () => {
    const map = importMarkdown("# Book\n- Ch 1\n- Ch 2\n");
    expect(map.title).toBe("Book");
    expect(map.nodes[map.rootId].childIds).toHaveLength(2);
  });

  it("returns an empty map for empty input", () => {
    expect(Object.keys(importMarkdown("  \n", "Empty").nodes)).toHaveLength(1);
  });
});

describe("SVG", () => {
  const palette: ExportPalette = {
    background: "#ffffff",
    foreground: "#111111",
    muted: "#777777",
    rootFill: "#111111",
    rootText: "#ffffff",
    branches: {
      teal: "#0f766e",
      clay: "#c2410c",
      ochre: "#ca8a04",
      indigo: "#4f46e5",
      moss: "#4d7c0f",
      plum: "#a21caf",
      rose: "#e11d48",
      slate: "#475569",
    },
  };

  it("renders every visible node and escapes text", () => {
    const map = sample();
    const svg = exportSvg(map, layoutMap(map, approxTextWidth), palette);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("Prototype &lt;fast&gt; &amp; cheap");
    expect(svg).toContain("#0f766e");
    expect(svg).not.toContain("<fast>");
  });

  it("shows a hidden-count badge for collapsed branches", () => {
    let map = sample();
    const research = map.nodes[map.rootId].childIds[0];
    map = toggleCollapsed(map, research);
    const svg = exportSvg(map, layoutMap(map, approxTextWidth), palette);
    expect(svg).not.toContain("Interview 5 users");
    expect(svg).toMatch(/>2<\/text>/);
  });
});

describe("helpers", () => {
  it("parses CSS colors to hex", () => {
    expect(toHex(parseColor("#abc")!)).toBe("#aabbcc");
    expect(toHex(parseColor("rgb(255, 0, 10)")!)).toBe("#ff000a");
    expect(toHex(parseColor("oklch(1 0 0)")!)).toBe("#ffffff");
    expect(toHex(parseColor("oklch(0 0 0)")!)).toBe("#000000");
    expect(parseColor("oklch(1 0 0 / 11%)")![3]).toBeCloseTo(0.11);
    expect(parseColor("nonsense")).toBeNull();
  });

  it("makes safe file names", () => {
    expect(fileNameFor("Rencana Liburan: Bali/Lombok!", ".png")).toBe("rencana-liburan-bali-lombok.png");
    expect(fileNameFor("???", ".md")).toBe("mind-map.md");
  });
});
