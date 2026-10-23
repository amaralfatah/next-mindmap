import { describe, expect, it } from "vitest";
import { importMarkdown } from "./index";

describe("Markdown", () => {
  it("reads headings, nested lists, notes and styles", () => {
    const md = [
      "# Launch plan",
      "",
      "## Research",
      "- **Interview 5 users**",
      "  > Ask about pricing",
      "  > and onboarding",
      "  - *Line one<br>line two*",
      "",
      "## Build",
      "- Prototype \\<fast\\> & cheap",
    ].join("\n");
    const map = importMarkdown(md);
    expect(map.title).toBe("Launch plan");
    const [research, build] = map.nodes[map.rootId].childIds.map((id) => map.nodes[id]);
    expect(research.text).toBe("Research");
    const interview = map.nodes[research.childIds[0]];
    expect(interview).toMatchObject({ text: "Interview 5 users", bold: true, note: "Ask about pricing\nand onboarding" });
    expect(map.nodes[interview.childIds[0]]).toMatchObject({ text: "Line one\nline two", italic: true });
    expect(map.nodes[build.childIds[0]].text).toBe("Prototype <fast> & cheap");
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
