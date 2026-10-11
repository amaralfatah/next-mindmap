// Generates the Mind Map app icon: app/icon.svg, app/apple-icon.png, public/icons/*.png.
// Run: node scripts/logo.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const S = 1024;
const f = (n) => +n.toFixed(1);

// Continuous-corner squircle (superellipse n = 5), the Apple icon silhouette.
function squircle(size, n = 5, steps = 160) {
  const r = size / 2, pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    pts.push(`${f(r + r * Math.sign(c) * Math.abs(c) ** (2 / n))} ${f(r + r * Math.sign(s) * Math.abs(s) ** (2 / n))}`);
  }
  return `M${pts.join("L")}Z`;
}

// Sararia palette (FAMILY.md section 6): neutral only, flat. Light: white tile, ink glyph.
const INK = "#1d1d1f", PAPER = "#ffffff";

// Mind map glyph on a 1024 grid: one root topic, four ideas. Mirror-symmetric.
// bg/fg are fill values or CSS classes, so the same artwork serves PNGs and the themed SVG.
const cy = 512, dy = 172, sw = 46, ph = 76;
const pill = (x, y, w) => `<rect x="${x}" y="${y - ph / 2}" width="${w}" height="${ph}" rx="${ph / 2}"/>`;
const arm = (sx, y) => `<path d="M512 ${cy} C${512 + sx * 84} ${cy}, ${512 + sx * 84} ${y}, ${512 + sx * 174} ${y}"/>`;
const glyph = (fg, bg) => `
  <g fill="none" ${fg.stroke} stroke-width="${sw}" stroke-linecap="round">
    ${arm(-1, cy - dy)}${arm(-1, cy + dy)}${arm(1, cy - dy)}${arm(1, cy + dy)}
  </g>
  <g ${fg.fill}>
    ${pill(190, cy - dy, 164)}${pill(190, cy + dy, 164)}${pill(670, cy - dy, 164)}${pill(670, cy + dy, 164)}
  </g>
  <rect x="392" y="${cy - 80}" width="240" height="160" rx="80" ${fg.root ?? `${fg.fill} ${bg.stroke}`} stroke-width="24" paint-order="stroke"/>`;
const flat = (c) => ({ fill: `fill="${c}"`, stroke: `stroke="${c}"` });

const svg = (inner, clip, style = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">${style}${clip ? `<clipPath id="sq"><path d="${squircle(S)}"/></clipPath><g clip-path="url(#sq)">${inner}</g>` : inner}</svg>`;

// Tile PNGs (apple-touch, PWA): light variant, full-bleed square, the OS applies its own mask.
const light = `<rect width="${S}" height="${S}" fill="${PAPER}"/>${glyph({ fill: `fill="${INK}"`, stroke: `stroke="${INK}"` }, flat(PAPER))}`;

// icon.svg (favicon): ink squircle with a light glyph, inverted in dark mode.
const style = `<style>.t{fill:${INK}}.g{fill:${PAPER}}.gs{fill:none;stroke:${PAPER}}.gr{fill:${PAPER};stroke:${INK}}@media (prefers-color-scheme:dark){.t{fill:${PAPER}}.g{fill:${INK}}.gs{stroke:${INK}}.gr{fill:${INK};stroke:${PAPER}}}</style>`;
const themed =
  `<rect class="t" width="${S}" height="${S}"/>` +
  glyph({ fill: 'class="g"', stroke: 'class="gs"', root: 'class="gr"' }, {});
writeFileSync("app/icon.svg", svg(themed, true, style));

const square = Buffer.from(svg(light, false));
const png = (size, out) => sharp(square, { density: 300 }).resize(size, size).png().toFile(out);
await png(180, "app/apple-icon.png");
for (const s of [192, 512]) {
  await png(s, `public/icons/icon-${s}.png`);
  await png(s, `public/icons/maskable-${s}.png`);
}
await png(1024, process.env.TEMP + "/mindmap-preview.png");
console.log("done");
