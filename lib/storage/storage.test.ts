import { describe, expect, it } from "vitest";
import { addChild, createMap } from "@/lib/model";
import { deleteMap, listMaps, loadMap, memoryBackend, saveMap, setBackend, summarize } from "./index";

describe("map storage via backend", () => {
  it("saves, lists newest first, loads and deletes", async () => {
    setBackend(memoryBackend());
    const a = { ...createMap("A"), updatedAt: 1 };
    const b = { ...createMap("B"), updatedAt: 2 };
    await saveMap(a);
    await saveMap(b);
    const { maps } = await listMaps();
    expect(maps.map((m) => m.title)).toEqual(["B", "A"]);
    expect(await loadMap(a.id)).toEqual(a);
    await deleteMap(a.id);
    expect(await loadMap(a.id)).toBeNull();
  });

  it("reports broken records instead of crashing", async () => {
    const backend = memoryBackend();
    setBackend(backend);
    await backend.set("bad", { nope: true } as never);
    await saveMap(createMap("Good"));
    const { maps, broken } = await listMaps();
    expect(maps.map((m) => m.title)).toEqual(["Good"]);
    expect(broken).toEqual(["bad"]);
  });

  it("summarizes a map", () => {
    const m = createMap("S");
    const s = summarize(addChild(m, m.rootId, "x").map);
    expect(s.nodeCount).toBe(2);
    expect(s.title).toBe("S");
  });
});
