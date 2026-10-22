"use client";

import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * A hand-drawn sample map that draws itself in: the product, not a stock illustration.
 * Shapes follow the editor's own styles (ink root, tinted main branches, plain-text leaves).
 */
/** Fixed geometry; the words come from the active language. */
const branchShapes = [
  { d: "M260,170 C300,170 300,92 340,92", color: "teal", x: 340, y: 76 },
  { d: "M260,170 C300,170 300,170 340,170", color: "clay", x: 340, y: 154 },
  { d: "M260,170 C300,170 300,248 340,248", color: "ochre", x: 340, y: 232 },
  { d: "M140,170 C100,170 100,118 60,118", color: "indigo", x: -36, y: 102 },
  { d: "M140,170 C100,170 100,222 60,222", color: "moss", x: -36, y: 206 },
];
const BRANCH_W = 96;

const leafShapes = [
  { from: [436, 92], to: [474, 62], color: "teal" },
  { from: [436, 92], to: [474, 104], color: "teal" },
  { from: [436, 170], to: [474, 150], color: "clay" },
  { from: [436, 170], to: [474, 192], color: "clay" },
  { from: [436, 248], to: [474, 262], color: "ochre" },
];

/** Rough width of a leaf label at 14.5px, so the caret lands after the word. */
const leafWidth = (text: string) => Math.min(104, Math.round(text.length * 7.3 + 12));

/**
 * `crop` is the phone version: the root and its right-hand branches only, so the words can be
 * drawn about 40% larger in a narrow column instead of shrinking the whole map.
 */
export function HeroArt({ crop = false, className }: { crop?: boolean; className?: string }) {
  const art = useT().home.heroArt;
  const branches = branchShapes
    .map((b, i) => ({ ...b, label: art.branches[i], w: BRANCH_W }))
    .slice(0, crop ? 3 : branchShapes.length);
  const leaves = leafShapes.map((l, i) => ({ ...l, text: art.leaves[i], w: leafWidth(art.leaves[i]) }));
  const last = leaves[leaves.length - 1];
  return (
    <svg
      viewBox={crop ? "122 46 478 232" : "-48 40 628 250"}
      className={cn("hero-art h-auto w-full overflow-visible", className)}
      role="img"
      aria-label={art.label}
    >
      <g fill="none" strokeLinecap="round">
        {branches.map((b, i) => (
          <path key={b.label} d={b.d} stroke={`var(--branch-${b.color})`} strokeWidth="3" pathLength={1} className="draw" style={{ animationDelay: `${200 + i * 90}ms` }} />
        ))}
        {leaves.map((l, i) => {
          const [x1, y1] = l.from;
          const [x2, y2] = l.to;
          const dx = (x2 - x1) / 2;
          return (
            <path
              key={l.text}
              d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`}
              stroke={`var(--branch-${l.color})`}
              strokeWidth="2"
              pathLength={1}
              className="draw"
              style={{ animationDelay: `${700 + i * 80}ms` }}
            />
          );
        })}
      </g>

      {branches.map((b, i) => (
        <g key={b.label} className="pop" style={{ animationDelay: `${420 + i * 90}ms` }}>
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={32}
            rx={11}
            fill={`color-mix(in oklch, var(--branch-${b.color}) 14%, var(--background))`}
            stroke={`var(--branch-${b.color})`}
            strokeWidth="1.5"
          />
          <text x={b.x + b.w / 2} y={b.y + 21} textAnchor="middle" className="fill-foreground font-sans text-[15px] font-semibold">
            {b.label}
          </text>
        </g>
      ))}

      {leaves.map((l, i) => (
        <text key={l.text} x={l.to[0] + 4} y={l.to[1] + 5} className="pop fill-foreground font-sans text-[14.5px] font-medium" style={{ animationDelay: `${900 + i * 80}ms` }}>
          {l.text}
        </text>
      ))}

      <g className="pop" style={{ animationDelay: "60ms" }}>
        <rect x="132" y="146" width="136" height="48" rx="17" className="fill-foreground" />
        <text x="200" y="176" textAnchor="middle" className="fill-background font-display text-[17px] font-semibold">
          {art.root}
        </text>
      </g>

      {/* The caret of a node being typed: the app is keyboard-first. */}
      <g className="pop" style={{ animationDelay: "1300ms" }}>
        <rect x={last.to[0] + last.w + 2} y={last.to[1] - 9} width="2" height="18" className="caret fill-ink" />
      </g>
    </svg>
  );
}
