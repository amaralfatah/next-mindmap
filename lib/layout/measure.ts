import type { MindNode } from "@/lib/model";
import { roleOf, metrics, NOTE_MARKER, PLACEHOLDER, type NodeRole } from "./metrics";

export type TextWidth = (text: string, role: NodeRole, bold: boolean, italic: boolean) => number;

export type Measured = { width: number; height: number; lines: string[] };

/** Greedy word wrap. Words wider than the line are broken by character. */
export function wrapText(text: string, maxWidth: number, width: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/(?<= )/); // keep trailing spaces with each word
    let line = "";
    for (const word of words) {
      if (line && width((line + word).trimEnd()) > maxWidth) {
        lines.push(line.trimEnd());
        line = "";
      }
      line += word;
      // A single word longer than the line: break it by character.
      while (width(line.trimEnd()) > maxWidth) {
        const chars = [...line];
        let fit = 1;
        while (fit < chars.length && width(chars.slice(0, fit + 1).join("")) <= maxWidth) fit++;
        lines.push(chars.slice(0, fit).join(""));
        line = chars.slice(fit).join("");
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export function measureNode(node: MindNode, depth: number, textWidth: TextWidth): Measured {
  const role = roleOf(depth);
  const m = metrics[role];
  const text = node.text || PLACEHOLDER;
  const bold = Boolean(node.bold) || role === "root";
  const w = (s: string) => textWidth(s, role, bold, Boolean(node.italic));
  const lines = wrapText(text, m.maxTextWidth, w);
  const textW = Math.max(...lines.map(w));
  const marker = (node.note ? NOTE_MARKER : 0) + (node.link ? NOTE_MARKER : 0);
  return {
    width: Math.ceil(Math.max(m.minWidth, textW + marker + m.padX * 2 + 6)),
    height: Math.ceil(lines.length * m.lineHeight + m.padY * 2),
    lines,
  };
}

export function fontFor(role: NodeRole, bold: boolean, italic: boolean, family: string): string {
  const m = metrics[role];
  const weight = bold ? 650 : m.fontWeight;
  return `${italic ? "italic " : ""}${weight} ${m.fontSize}px ${family}`;
}

/** Canvas-based text measurer with a cache. Browser only. */
export function createCanvasTextWidth(familyFor: (role: NodeRole) => string): TextWidth {
  const ctx = document.createElement("canvas").getContext("2d");
  const cache = new Map<string, number>();
  return (text, role, bold, italic) => {
    const font = fontFor(role, bold, italic, familyFor(role));
    const key = `${font}|${text}`;
    let value = cache.get(key);
    if (value === undefined) {
      if (ctx) {
        ctx.font = font;
        value = ctx.measureText(text).width;
      } else value = text.length * metrics[role].fontSize * 0.55;
      if (cache.size > 5000) cache.clear();
      cache.set(key, value);
    }
    return value;
  };
}

/** Deterministic approximation for tests and non-DOM environments. */
export const approxTextWidth: TextWidth = (text, role) => text.length * metrics[role].fontSize * 0.55;
