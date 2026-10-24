import { cn } from "@/lib/utils";

const PETALS = [
  { cx: 67.68, cy: 32.32, deg: -45, accent: true },
  { cx: 67.68, cy: 67.68, deg: 45 },
  { cx: 32.32, cy: 67.68, deg: 135 },
  { cx: 32.32, cy: 32.32, deg: 225 },
];

/**
 * The Mind Map glyph: the kawung motif, four ovals around one centre. Same artwork as the app icon
 * (scripts/logo.mjs, small variant so the gaps hold at text size), without the tile: the ovals
 * follow the text colour and the top-right one takes --primary.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="19.5 19.5 61 61" aria-hidden fill="currentColor" className={className}>
      {PETALS.map(({ cx, cy, deg, accent }) => (
        <ellipse
          key={deg}
          cx={cx}
          cy={cy}
          rx="14"
          ry="10.4"
          transform={`rotate(${deg} ${cx} ${cy})`}
          className={accent ? "fill-primary" : undefined}
        />
      ))}
      <circle cx="50" cy="50" r="6.5" />
    </svg>
  );
}

/**
 * Mind Map lockup: the kawung glyph, then the product name in Inter SemiBold with −0.045em
 * tracking, in ink (#1d1d1f) on light and white on dark. Only the glyph's one oval is pink.
 */
export function Wordmark({ className, title = "Mind Map" }: { className?: string; title?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.4em] font-[family-name:var(--font-brand-face)] text-[17px] leading-none font-semibold tracking-[-0.045em] text-[#1d1d1f] dark:text-white",
        className,
      )}
    >
      <Mark className="size-[1.15em] shrink-0" />
      <span>{title}</span>
    </span>
  );
}
