import { memo, useMemo } from "react";
import { approxTextWidth, isRoot, layoutMap, metrics, roleOf, TOGGLE_OFFSET, type Box, type TextWidth } from "@/lib/layout";
import type { MindMap } from "@/lib/model";
import { useTextWidth } from "@/lib/editor/text-width";
import { branchVar, getContrastTextColor, resolveNodeColor } from "@/components/editor/node-color";

/** Thickness of a line of "text" in the miniature, as a share of the role's line height. */
const BAR = 0.42;

/**
 * A miniature of the map as the editor draws it, without the words: the same layout, edges,
 * node fills and borders, and expand/collapse toggles, with each line of text drawn as a
 * faint bar of its real length.
 */
function MapThumbView({ map }: { map: MindMap }) {
  const measure = useTextWidth() ?? approxTextWidth;
  const layout = useMemo(() => layoutMap(map, measure), [map, measure]);
  const { bounds } = layout;
  // Never zoom in past a small map's natural size, so a lone root stays modest.
  const width = Math.max(bounds.width + 96, 900);
  const height = Math.max(bounds.height + 96, 506);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const viewBox = `${cx - width / 2} ${cy - height / 2} ${width} ${height}`;

  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden>
      {layout.edges.map((e) => (
        <path key={e.id} d={e.path} fill="none" stroke={branchVar(e.color)} strokeWidth={e.width * 1.6} strokeLinecap="round" />
      ))}
      {Object.values(layout.boxes).map((b) => (
        <ThumbNode key={b.id} box={b} map={map} measure={measure} />
      ))}
    </svg>
  );
}

function ThumbNode({ box, map, measure }: { box: Box; map: MindMap; measure: TextWidth }) {
  const node = map.nodes[box.id];
  const role = roleOf(box.depth);
  const m = metrics[role];
  const fill = resolveNodeColor(node.fill);
  const border = resolveNodeColor(node.border);
  const ink = fill ? getContrastTextColor(node.fill) : "var(--foreground)";
  const h = m.lineHeight * BAR;
  const top = box.y + (box.height - box.lines.length * m.lineHeight) / 2;
  const bold = Boolean(node.bold) || isRoot(box);

  return (
    <g>
      {box.boxed && (
        <rect
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          rx={8}
          fill={fill ?? "none"}
          stroke={border ?? "none"}
          strokeWidth={border ? 2 : 0}
        />
      )}
      {box.lines.map((line, i) => {
        const w = Math.max(h, measure(line, role, bold, Boolean(node.italic)));
        return (
          <rect
            key={i}
            x={box.x + (box.width - w) / 2}
            y={top + i * m.lineHeight + (m.lineHeight - h) / 2}
            width={w}
            height={h}
            rx={h / 2}
            fill={ink}
            opacity={node.text ? 0.55 : 0.25}
          />
        );
      })}
      {!isRoot(box) && node.childIds.length > 0 && <Toggle box={box} collapsed={box.hidden > 0} />}
    </g>
  );
}

/** The stem and toggle where a parent's children branch off, as on the canvas. */
function Toggle({ box, collapsed }: { box: Box; collapsed: boolean }) {
  const color = branchVar(box.color);
  const y = box.y + box.height / 2;
  const edge = box.side === "left" ? box.x : box.x + box.width;
  const x = box.side === "left" ? edge - TOGGLE_OFFSET : edge + TOGGLE_OFFSET;
  const stem = <path d={`M${edge},${y}H${x}`} stroke={color} strokeWidth={3} />;
  if (collapsed) {
    // The "+N" badge, without its number.
    const w = 18 + String(box.hidden).length * 6;
    return (
      <g>
        {stem}
        <rect x={x - w / 2} y={y - 8} width={w} height={16} rx={8} fill={color} />
      </g>
    );
  }
  return (
    <g>
      {stem}
      <circle cx={x} cy={y} r={6} fill="var(--paper-2)" stroke={color} strokeWidth={2.5} />
    </g>
  );
}

export const MapThumb = memo(MapThumbView);
