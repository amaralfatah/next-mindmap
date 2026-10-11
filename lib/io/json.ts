import { MapFormatError, migrateMap, newId, type MindMap } from "@/lib/model";

export const FILE_EXTENSION = ".mindmap.json";

type Backup = { kind: "mindmap-backup"; exportedAt: number; maps: MindMap[] };

export function exportMapJson(map: MindMap): string {
  return JSON.stringify(map, null, 2);
}

export function exportBackupJson(maps: MindMap[], now = Date.now()): string {
  const backup: Backup = { kind: "mindmap-backup", exportedAt: now, maps };
  return JSON.stringify(backup, null, 2);
}

/**
 * Parses a `.mindmap.json` file: a single map or a backup of many. Imported maps get fresh ids
 * so they never overwrite an existing map. Throws MapFormatError on anything invalid; nothing
 * is returned partially.
 */
export function importJson(text: string): MindMap[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new MapFormatError("The file is not valid JSON.", "invalid");
  }
  const list =
    typeof data === "object" && data !== null && (data as Backup).kind === "mindmap-backup"
      ? (data as Backup).maps
      : [data];
  if (!Array.isArray(list) || list.length === 0) throw new MapFormatError("The backup has no maps.", "invalid");
  return list.map((raw) => ({ ...migrateMap(raw), id: newId() }));
}
