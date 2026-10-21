import { describe, expect, it } from "vitest";
import { addChild, createMap } from "@/lib/model";
import {
  deleteMap,
  listMaps,
  loadMap,
  MapGoneError,
  memoryBackend,
  SaveConflictError,
  saveMap,
  setBackend,
  summarize,
} from "./index";

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

  it("conditional saves refuse to overwrite newer or deleted maps", async () => {
    setBackend(memoryBackend());
    const a = { ...createMap("A"), updatedAt: 1 };
    await saveMap(a);
    await saveMap({ ...a, title: "A2", updatedAt: 2 }, 1);
    await expect(saveMap({ ...a, title: "stale", updatedAt: 3 }, 1)).rejects.toBeInstanceOf(SaveConflictError);
    expect((await loadMap(a.id))?.updatedAt).toBe(2);
    await deleteMap(a.id);
    await expect(saveMap({ ...a, updatedAt: 4 }, 2)).rejects.toBeInstanceOf(MapGoneError);
    // Without a base the write is unconditional, which is how "keep mine" restores a map.
    await saveMap({ ...a, updatedAt: 5 });
    expect((await loadMap(a.id))?.updatedAt).toBe(5);
  });

  it("summarizes a map", () => {
    const m = createMap("S");
    const s = summarize(addChild(m, m.rootId, "x").map);
    expect(s.nodeCount).toBe(2);
    expect(s.title).toBe("S");
  });
});
