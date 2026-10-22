import { branchColors, type BranchColor, type MindMap } from "@/lib/model";
import { isRoot, metrics, roleOf, NOTE_MARKER, PLACEHOLDER, type Box, type Layout } from "@/lib/layout";
import { parseColor, toHex } from "./color";

export type ExportPalette = {
  background: string;
  foreground: string;
  muted: string;
  rootFill: string;
  rootText: string;
  branches: Record<BranchColor, string>;
};

/** Font stack for exported images; images can't load web fonts, so this is a universal stack. */
export const EXPORT_FONT = "Arial, Helvetica, sans-serif";

const PADDING = 48;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}



function branchHex(palette: ExportPalette, color: BranchColor | null): string {
  return color ? palette.branches[color] : palette.muted;
}

function textBlock(box: Box, map: MindMap, fill: string): string {
  const node = map.nodes[box.id];
  const m = metrics[roleOf(box.depth)];
  const weight = node.bold || isRoot(box) ? 700 : 400;
  const style = node.italic ? ' font-style="italic"' : "";
  const lines = node.text ? box.lines : [PLACEHOLDER];
  const x = box.x + m.padX + 3;
  const tspans = lines
    .map((line, i) => {
      const y = box.y + m.padY + i * m.lineHeight + m.lineHeight / 2 + m.fontSize * 0.35;
      return `<tspan x="${x}" y="${y.toFixed(1)}">${esc(line) || " "}</tspan>`;
    })
    .join("");
  const opacity = node.text ? "" : ' fill-opacity="0.45"';
  return `<text font-size="${m.fontSize}" font-weight="${weight}"${style} fill="${fill}"${opacity}>${tspans}</text>`;
}

function noteMarker(box: Box, fill: string): string {
  const m = metrics[roleOf(box.depth)];
  const cx = box.x + box.width - m.padX - NOTE_MARKER / 2 + 2;
  const cy = box.y + m.padY + m.lineHeight / 2;
  return `<g fill="none" stroke="${fill}" stroke-width="1.4" stroke-linecap="round" opacity="0.65"><path d="M${cx - 5},${cy - 3}h10M${cx - 5},${cy}h10M${cx - 5},${cy + 3}h6"/></g>`;
}

/** Standalone SVG of the visible map, using concrete sRGB colors and a universal font. */
export function exportSvg(map: MindMap, layout: Layout, palette: ExportPalette): string {
  const { bounds } = layout;
  const width = Math.ceil(bounds.width + PADDING * 2);
  const height = Math.ceil(bounds.height + PADDING * 2);
  const ox = PADDING - bounds.x;
  const oy = PADDING - bounds.y;
  const parts: string[] = [];

  for (const edge of layout.edges) {
    parts.push(
      `<path d="${edge.path}" fill="none" stroke="${branchHex(palette, edge.color)}" stroke-width="${edge.width}" stroke-linecap="round"/>`,
    );
  }

  const resolveSvgColor = (c: string | undefined): string | undefined => {
    if (!c) return undefined;
    if (c in palette.branches) return palette.branches[c as BranchColor];
    return c;
  };

  for (const box of Object.values(layout.boxes)) {
    const node = map.nodes[box.id];
    const color = branchHex(palette, box.color);
    if (box.boxed && (node.fill || node.border)) {
      const bgFill = resolveSvgColor(node.fill) ?? "none";
      const borderStroke = resolveSvgColor(node.border) ?? "none";
      const isLightBg = bgFill === "#ffffff" || bgFill === "#fcc419" || bgFill === "#94d82d";
      const textColor = node.fill ? (isLightBg ? "#1e293b" : "#ffffff") : palette.foreground;
      parts.push(
        `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="8" fill="${bgFill}" stroke="${borderStroke}" stroke-width="${borderStroke !== "none" ? "2" : "0"}"/>`,
        textBlock(box, map, textColor),
      );
    } else {
      parts.push(textBlock(box, map, palette.foreground));
    }
    if (node.note) parts.push(noteMarker(box, palette.foreground));
    if (box.hidden > 0) {
      const cx = box.side === "left" ? box.x - 14 : box.x + box.width + 14;
      const cy = box.y + box.height / 2;
      parts.push(
        `<circle cx="${cx}" cy="${cy}" r="10" fill="${palette.background}" stroke="${color}" stroke-width="1.5"/>`,
        `<text x="${cx}" y="${cy + 3.5}" font-size="10" font-weight="700" text-anchor="middle" fill="${palette.foreground}">${box.hidden > 99 ? "99+" : box.hidden}</text>`,
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${EXPORT_FONT}">`,
    `<title>${esc(map.title)}</title>`,
    `<rect width="100%" height="100%" fill="${palette.background}"/>`,
    `<g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)})">`,
    ...parts,
    `</g></svg>`,
  ].join("\n");
}

/**
 * Reads the live theme tokens and converts them to hex. The build may emit any CSS color
 * syntax (oklch, lab…), so the browser itself does the conversion by painting one pixel.
 * Browser only.
 */
export function readPalette(element: Element = document.documentElement): ExportPalette {
  const css = getComputedStyle(element);
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const hex = (name: string, fallback: string) => {
    const value = css.getPropertyValue(name).trim();
    const parsed = value ? parseColor(value) : null;
    if (parsed) return toHex(parsed);
    if (!ctx || !value) return fallback;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = fallback;
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return toHex([r, g, b, 1]);
  };
  const branches = Object.fromEntries(
    branchColors.map((c) => [c, hex(`--branch-${c}`, "#4b8a85")]),
  ) as Record<BranchColor, string>;
  return {
    background: hex("--background", "#fbfaf6"),
    foreground: hex("--foreground", "#1d2a2c"),
    muted: hex("--muted-foreground", "#66777a"),
    rootFill: hex("--foreground", "#1d2a2c"),
    rootText: hex("--background", "#fbfaf6"),
    branches,
  };
}

/** Rasterizes an SVG string to a PNG blob at `scale`. Browser only. */
export async function svgToPng(svg: string, scale = 2): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    // Browsers cap canvas size; shrink the scale for huge maps instead of failing.
    const maxSide = 16000;
    const s = Math.min(scale, maxSide / img.naturalWidth, maxSide / img.naturalHeight);
    canvas.width = Math.round(img.naturalWidth * s);
    canvas.height = Math.round(img.naturalHeight * s);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.scale(s, s);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image."))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
