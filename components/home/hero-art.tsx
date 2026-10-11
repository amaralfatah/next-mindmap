/**
 * A hand-drawn sample map that draws itself in: the product, not a stock illustration.
 * Shapes follow the editor's own styles (ink root, tinted main branches, underlined leaves).
 */
const branches = [
  { d: "M260,170 C300,170 300,92 340,92", color: "teal", label: "Before", x: 340, y: 76, w: 92 },
  { d: "M260,170 C300,170 300,170 340,170", color: "clay", label: "During", x: 340, y: 154, w: 94 },
  { d: "M260,170 C300,170 300,248 340,248", color: "ochre", label: "After", x: 340, y: 232, w: 80 },
  { d: "M140,170 C100,170 100,118 60,118", color: "indigo", label: "Budget", x: -36, y: 102, w: 96, left: true },
  { d: "M140,170 C100,170 100,222 60,222", color: "moss", label: "People", x: -34, y: 206, w: 94, left: true },
];

const leaves = [
  { from: [432, 92], to: [470, 62], w: 92, text: "Book flights", color: "teal" },
  { from: [432, 92], to: [470, 104], w: 70, text: "Pack light", color: "teal" },
  { from: [434, 170], to: [472, 150], w: 96, text: "Rinjani trek", color: "clay" },
  { from: [434, 170], to: [472, 192], w: 84, text: "Gili islands", color: "clay" },
  { from: [420, 248], to: [458, 262], w: 76, text: "Photo book", color: "ochre" },
];

export function HeroArt() {
  return (
    <svg viewBox="-60 20 640 290" className="hero-art h-auto w-full overflow-visible" role="img" aria-label="A sample mind map about a trip">
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
              d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2} H${x2 + l.w}`}
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
          <text x={b.x + b.w / 2} y={b.y + 21} textAnchor="middle" className="fill-foreground font-sans text-[14px] font-semibold">
            {b.label}
          </text>
        </g>
      ))}

      {leaves.map((l, i) => (
        <text key={l.text} x={l.to[0] + 4} y={l.to[1] - 6} className="pop fill-foreground font-sans text-[13px]" style={{ animationDelay: `${900 + i * 80}ms` }}>
          {l.text}
        </text>
      ))}

      <g className="pop" style={{ animationDelay: "60ms" }}>
        <rect x="132" y="146" width="136" height="48" rx="17" className="fill-foreground" />
        <text x="200" y="176" textAnchor="middle" className="fill-background font-display text-[17px] font-semibold">
          Trip to Lombok
        </text>
      </g>

      {/* The caret of a node being typed: the app is keyboard-first. */}
      <g className="pop" style={{ animationDelay: "1300ms" }}>
        <rect x="536" y="242" width="2" height="18" className="caret fill-ink" />
      </g>
    </svg>
  );
}
