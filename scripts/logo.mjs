// Generates the Mind Map app icon: app/icon.svg, app/apple-icon.png, public/icons/*.png.
// Same artwork as sararia-logo/apps/gagas (gagasGlyph) and next-sararia's `gagas` icon.
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

// Sararia "ink + one accent" pattern (FAMILY.md section 6): ink tile in light and dark alike,
// white glyph, one part in the app's --primary.
const INK = "#1d1d1f", PAPER = "#ffffff", ACCENT = "#d6286a";

// Kawung: four ovals around one centre, the top-right one in the accent. The small variant
// (favicon) has plumper ovals and a smaller centre so the gaps survive at 16 px.
function glyph({ small = false } = {}) {
  const k = S / 100;
  const [d, rx, ry, r] = (small ? [25, 14, 10.4, 6.5] : [24.4, 13.7, 9.4, 7.2]).map((v) => v * k);
  const petal = (deg, fill) => {
    const a = (deg * Math.PI) / 180, x = f(512 + d * Math.cos(a)), y = f(512 + d * Math.sin(a));
    return `<ellipse cx="${x}" cy="${y}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${deg} ${x} ${y})" fill="${fill}"/>`;
  };
  return petal(-45, ACCENT) + petal(45, PAPER) + petal(135, PAPER) + petal(225, PAPER) + `<circle cx="512" cy="512" r="${f(r)}" fill="${PAPER}"/>`;
}

const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">${inner}</svg>`;

// icon.svg (favicon): ink squircle with the small glyph. The ink tile reads on light and dark tab
// bars, so there is no theme switch.
writeFileSync("app/icon.svg", svg(`<path d="${squircle(S)}" fill="${INK}"/>${glyph({ small: true })}`) + "\n");

// Tile PNGs (apple-touch, PWA): full-bleed square, the OS applies its own mask. The glyph sits
// inside the maskable safe zone (radius 40%), so one artwork serves both.
const square = Buffer.from(svg(`<rect width="${S}" height="${S}" fill="${INK}"/>${glyph()}`));
const png = (size, out) => sharp(square, { density: 300 }).resize(size, size).png().toFile(out);
await png(180, "app/apple-icon.png");
for (const s of [192, 512]) {
  await png(s, `public/icons/icon-${s}.png`);
  await png(s, `public/icons/maskable-${s}.png`);
}
console.log("done");
