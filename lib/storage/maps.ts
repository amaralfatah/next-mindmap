import { migrateMap, nodeCount, type MindMap } from "@/lib/model";

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

export type Backend = {
  get(id: string): Promise<unknown>;
  set(id: string, value: MindMap): Promise<void>;
  del(id: string): Promise<void>;
  entries(): Promise<[string, unknown][]>;
};

const LOCAL_PREFIX = "mindmap:map:";

/** Guest storage: maps live in this browser only. */
const local = {
  get(id: string): unknown {
    try {
      const raw = localStorage.getItem(LOCAL_PREFIX + id);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  },
  set(id: string, value: MindMap) {
    localStorage.setItem(LOCAL_PREFIX + id, JSON.stringify(value));
  },
  del(id: string) {
    try {
      localStorage.removeItem(LOCAL_PREFIX + id);
    } catch {}
  },
  entries(): [string, unknown][] {
    const out: [string, unknown][] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(LOCAL_PREFIX)) continue;
        out.push([key.slice(LOCAL_PREFIX.length), JSON.parse(localStorage.getItem(key)!)]);
      }
    } catch {}
    return out;
  },
};

/** Cloud when signed in (API returns 401 otherwise), localStorage as guest fallback. */
function databaseBackend(): Backend {
  return {
    get: async (id: string) => {
      const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (res.status === 404 || res.status === 401) return local.get(id);
      if (!res.ok) throw new Error(`Failed to load map: ${res.statusText}`);
      const data = await res.json();
      return data.map;
    },
    set: async (id: string, value: MindMap) => {
      const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      if (res.status === 401) return local.set(id, value);
      if (!res.ok) throw new Error(`Failed to save map: ${res.statusText}`);
      local.del(id);
    },
    del: async (id: string) => {
      local.del(id);
      const res = await fetch(`/api/maps/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404 && res.status !== 401) {
        throw new Error(`Failed to delete map: ${res.statusText}`);
      }
    },
    entries: async () => {
      const res = await fetch("/api/maps", { cache: "no-store" });
      if (res.status === 401) return local.entries();
      if (!res.ok) throw new Error(`Failed to list maps: ${res.statusText}`);
      const data = await res.json();
      const list = (data.maps as MindMap[]) || [];
      return list.map((m) => [m.id, m]);
    },
  };
}

export function memoryBackend(): Backend {
  const data = new Map<string, MindMap>();
  return {
    get: async (id) => structuredClone(data.get(id)),
    set: async (id, value) => void data.set(id, structuredClone(value)),
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

export async function saveMap(map: MindMap): Promise<void> {
  const b = getBackend();
  await b.set(map.id, map);
}

export async function deleteMap(id: string): Promise<void> {
  const b = getBackend();
  await b.del(id);
}
