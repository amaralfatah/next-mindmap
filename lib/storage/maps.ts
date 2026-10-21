import { MapFormatError, migrateMap, nodeCount, type MindMap } from "@/lib/model";

/**
 * Map persistence via Next.js API routes backed by Neon PostgreSQL.
 */

export type MapSummary = {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  nodeCount: number;
};

/** The request was refused because nobody is signed in. Maps live only in the signed-in account. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Sign in to open your maps");
    this.name = "UnauthorizedError";
  }
}

/** A conditional save found a newer copy than the one it was based on. */
export class SaveConflictError extends Error {
  constructor() {
    super("The map was changed elsewhere");
    this.name = "SaveConflictError";
  }
}

/** A conditional save found that the map no longer exists. */
export class MapGoneError extends Error {
  constructor() {
    super("The map was deleted elsewhere");
    this.name = "MapGoneError";
  }
}

export type Backend = {
  get(id: string): Promise<unknown>;
  /**
   * Writes the map. With `base`, the write only lands if the stored copy still has that
   * `updatedAt`; otherwise it throws `SaveConflictError`, or `MapGoneError` if it was deleted.
   */
  set(id: string, value: MindMap, base?: number): Promise<void>;
  del(id: string): Promise<void>;
  entries(): Promise<[string, unknown][]>;
};

async function check(res: Response, what: string): Promise<Response> {
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Failed to ${what}: ${res.status} ${res.statusText}`);
  return res;
}

/** Maps of the signed-in account, through the `/api/maps` routes backed by Neon PostgreSQL. */
function databaseBackend(): Backend {
  return {
    get: async (id) => {
      const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.status === 404) return undefined;
      const data = await (await check(res, "load map")).json();
      return data.map;
    },
    set: async (id, value, base) => {
      const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(base !== undefined ? { "X-Base-Updated-At": String(base) } : null),
        },
        body: JSON.stringify(value),
      });
      if (res.status === 409) throw new SaveConflictError();
      if (res.status === 410) throw new MapGoneError();
      await check(res, "save map");
    },
    del: async (id) => {
      const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.status !== 404) await check(res, "delete map");
    },
    entries: async () => {
      const res = await fetch("/api/maps", { cache: "no-store" });
      const data = await (await check(res, "list maps")).json();
      const list = (data.maps as MindMap[]) || [];
      return list.map((m) => [m.id, m]);
    },
  };
}

export function memoryBackend(): Backend {
  const data = new Map<string, MindMap>();
  return {
    get: async (id) => structuredClone(data.get(id)),
    set: async (id, value, base) => {
      if (base !== undefined) {
        const current = data.get(id);
        if (!current) throw new MapGoneError();
        if (current.updatedAt !== base) throw new SaveConflictError();
      }
      data.set(id, structuredClone(value));
    },
    del: async (id) => void data.delete(id),
    entries: async () => [...data.entries()].map(([k, v]) => [k, structuredClone(v)] as [string, unknown]),
  };
}

let backendInstance: Backend | null = null;

function getBackend(): Backend {
  backendInstance ??= databaseBackend();
  return backendInstance;
}

/** For tests: use a specific backend. */
export function setBackend(b: Backend): void {
  backendInstance = b;
}

export function summarize(map: MindMap): MapSummary {
  return {
    id: map.id,
    title: map.title,
    updatedAt: map.updatedAt,
    createdAt: map.createdAt,
    nodeCount: nodeCount(map),
  };
}

export type ListResult = { maps: MindMap[]; broken: string[] };

/** All readable maps, newest first. Records that fail validation are reported, not dropped. */
export async function listMaps(): Promise<ListResult> {
  const b = getBackend();
  const maps: MindMap[] = [];
  const broken: string[] = [];
  for (const [key, value] of await b.entries()) {
    try {
      maps.push(migrateMap(value));
    } catch {
      broken.push(key);
    }
  }
  maps.sort((a, b) => b.updatedAt - a.updatedAt);
  return { maps, broken };
}

export async function loadMap(id: string): Promise<MindMap | null> {
  const b = getBackend();
  const value = await b.get(id);
  if (value === undefined) return null;
  return migrateMap(value);
}

/** Saves the map; pass `base` (the `updatedAt` this copy was built on) to refuse overwriting newer edits. */
export async function saveMap(map: MindMap, base?: number): Promise<void> {
  const b = getBackend();
  await b.set(map.id, map, base);
}

export async function deleteMap(id: string): Promise<void> {
  const b = getBackend();
  await b.del(id);
}

const LEGACY_PREFIX = "mindmap:map:";

/**
 * Guest mode is gone, but maps made as a guest may still sit in this browser's localStorage.
 * Once someone signs in, move them into the account so they are not stranded, then clear them.
 * Returns how many maps were moved.
 */
export async function adoptLegacyGuestMaps(): Promise<number> {
  let keys: string[];
  try {
    keys = Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_PREFIX));
  } catch {
    return 0;
  }
  let moved = 0;
  for (const key of keys) {
    try {
      const map = migrateMap(JSON.parse(localStorage.getItem(key)!));
      if (!(await getBackend().get(map.id))) await saveMap(map);
      localStorage.removeItem(key);
      moved++;
    } catch (err) {
      // Unreadable leftovers are dropped; failed uploads stay for the next sign-in.
      if (err instanceof MapFormatError || err instanceof SyntaxError) localStorage.removeItem(key);
    }
  }
  return moved;
}
