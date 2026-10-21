import { NextResponse } from "next/server";

/** Largest map body the API accepts. A map with thousands of nodes and notes stays well below it. */
export const MAX_MAP_BYTES = 2 * 1024 * 1024;

/**
 * Reads a JSON map body, refusing oversized or malformed payloads before parsing them.
 * Returns the parsed value, or a response to send back as is.
 */
export async function readMapBody(request: Request): Promise<{ body: unknown } | { error: NextResponse }> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_MAP_BYTES) return { error: tooLarge() };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_MAP_BYTES) return { error: tooLarge() };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { error: NextResponse.json({ error: "Invalid map payload" }, { status: 400 }) };
  }
}

function tooLarge() {
  return NextResponse.json({ error: "Map is too large" }, { status: 413 });
}
