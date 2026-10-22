import { memo, useMemo } from "react";
import { approxTextWidth, isRoot, layoutMap } from "@/lib/layout";
import type { MindMap } from "@/lib/model";

/**
 * A schematic of the map for its card: edges and blocks only, no text. Uses approximate text
 * widths so it costs nothing to compute and never waits for fonts.
 */
function MapThumbView({ map }: { map: MindMap }) {
  const layout = useMemo(() => layoutMap(map, approxTextWidth), [map]);
  const { bounds } = layout;
  // Never zoom in past a small map's natural size, so a lone root stays a modest pill.
  const width = Math.max(bounds.width + 80, 760);
  const height = Math.max(bounds.height + 80, 428);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const viewBox = `${cx - width / 2} ${cy - height / 2} ${width} ${height}`;
  const color = (c: string | null) => (c ? `var(--branch-${c})` : "var(--muted-foreground)");

  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden>
      {layout.edges.map((e) => (
        <path key={e.id} d={e.path} fill="none" stroke={color(e.color)} strokeWidth={e.width * 2.2} strokeLinecap="round" />
      ))}
      {Object.values(layout.boxes).map((b) => (
        <path
          key={b.id}
          d={`M${b.x + 6},${b.y + b.height / 2}H${b.x + b.width - 6}`}
          stroke={isRoot(b) ? "var(--foreground)" : color(b.color)}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export const MapThumb = memo(MapThumbView);
