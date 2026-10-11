"use client";

import { download, EXPORT_FONT, exportMapJson, exportMarkdown, exportSvg, FILE_EXTENSION, fileNameFor, readPalette, svgToPng } from "@/lib/io";
import { createCanvasTextWidth, layoutMap } from "@/lib/layout";
import type { MindMap } from "@/lib/model";
import { markExported } from "@/lib/storage";

export type ExportFormat = "png" | "svg" | "md" | "json";

/** Exports a map in the current theme. Images are laid out with the export font so text fits. */
export async function exportMap(map: MindMap, format: ExportFormat): Promise<void> {
  if (format === "json") {
    download(exportMapJson(map), fileNameFor(map.title, FILE_EXTENSION), "application/json");
    markExported();
    return;
  }
  if (format === "md") {
    download(exportMarkdown(map), fileNameFor(map.title, ".md"), "text/markdown");
    return;
  }
  const layout = layoutMap(map, createCanvasTextWidth(() => EXPORT_FONT));
  const svg = exportSvg(map, layout, readPalette());
  if (format === "svg") {
    download(svg, fileNameFor(map.title, ".svg"), "image/svg+xml");
    return;
  }
  download(await svgToPng(svg, 2), fileNameFor(map.title, ".png"));
}
