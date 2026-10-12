import { beforeEach, describe, expect, it } from "vitest";
import { createMap, nodeCount } from "@/lib/model";
import { useEditor } from "./store";

const s = () => useEditor.getState();
const map = () => s().history!.present.map;

/** Types a label into the node being edited and commits it, as the textarea would. */
function type(text: string) {
  s().setDraft(text);
  s().commitEdit();
}

beforeEach(() => {
  s().load(createMap("Root"));
});

describe("editor store", () => {
  it("builds a small map from the keyboard flow", () => {
    s().addChild();
    type("A");
    s().addChild();
    type("A1");
    s().addSibling();
    type("A2");
    expect(nodeCount(map())).toBe(4);
    const a = map().nodes[map().rootId].childIds[0];
    expect(map().nodes[a].childIds.map((id) => map().nodes[id].text)).toEqual(["A1", "A2"]);
  });

  it("one undo step per action, restoring the selection", () => {
    s().addChild();
    type("A");
    const a = s().selectedId;
    s().addChild();
    type("B");
    s().undo(); // text B
    s().undo(); // add B
    expect(s().selectedId).toBe(a);
    expect(map().nodes[a].childIds).toHaveLength(0);
    s().redo();
    expect(map().nodes[a].childIds).toHaveLength(1);
  });

  it("Esc on a brand-new empty node removes it", () => {
    s().addChild();
    s().escapeEdit();
    expect(nodeCount(map())).toBe(1);
    expect(s().editingId).toBeNull();
    expect(s().selectedId).toBe(map().rootId);
  });

  it("Esc keeps typed text, and never undoes older steps", () => {
    s().addChild();
    s().setDraft("kept");
    s().escapeEdit();
    expect(nodeCount(map())).toBe(2);
    s().startEdit();
    s().setDraft("");
    s().escapeEdit();
    expect(nodeCount(map())).toBe(2);
  });

  it("does not delete the root and keeps edits out of history until committed", () => {
    s().remove();
    expect(nodeCount(map())).toBe(1);
    s().startEdit(undefined, "X");
    expect(s().history!.past).toHaveLength(0);
    s().commitEdit();
    expect(map().title).toBe("X");
    expect(s().history!.past).toHaveLength(1);
  });

  it("search reveals collapsed matches and cycles", () => {
    s().addChild();
    type("Alpha");
    const alpha = s().selectedId;
    s().addChild();
    type("alpha child");
    s().select(alpha);
    s().toggleCollapse();
    expect(map().nodes[alpha].collapsed).toBe(true);
    s().openSearch();
    s().setQuery("alpha");
    expect(s().search.results).toHaveLength(2);
    s().stepSearch(1);
    expect(map().nodes[alpha].collapsed).toBeUndefined();
    expect(map().nodes[s().selectedId].text).toBe("alpha child");
  });

  it("updates node text with emoticons and maintains history", () => {
    s().addChild();
    type("Plan");
    const id = s().selectedId;
    s().patch({ text: `${map().nodes[id].text} 🚀` }, id);
    expect(map().nodes[id].text).toBe("Plan 🚀");
    s().undo();
    expect(map().nodes[id].text).toBe("Plan");
    s().redo();
    expect(map().nodes[id].text).toBe("Plan 🚀");
  });
});
