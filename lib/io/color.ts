/** Minimal CSS color parsing so exported files use plain sRGB hex that every viewer understands. */

export type Rgba = [number, number, number, number];

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function num(token: string, percentScale = 1): number {
  const t = token.trim();
  if (t.endsWith("%")) return (parseFloat(t) / 100) * percentScale;
  return parseFloat(t);
}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((x) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055;
    return Math.round(clamp01(v) * 255);
  }) as [number, number, number];
}

export function parseColor(input: string): Rgba | null {
  const value = input.trim().toLowerCase();
  const hex = value.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const fn = value.match(/^(oklch|rgba?)\((.*)\)$/);
  if (!fn) return null;
  const [main, alphaPart] = fn[2].split("/");
  const parts = main.replace(/,/g, " ").trim().split(/\s+/);
  const legacyAlpha = fn[1] !== "oklch" && parts.length === 4 ? parts.pop() : undefined;
  const alphaToken = alphaPart ?? legacyAlpha;
  const alpha = alphaToken === undefined ? 1 : clamp01(num(alphaToken));
  if (fn[1] === "oklch") {
    const [L, C, H] = [num(parts[0]), num(parts[1], 0.4), parts[2] === "none" ? 0 : parseFloat(parts[2])];
    return [...oklchToRgb(L, C, H), alpha];
  }
  const [r, g, b] = parts.map((p) => Math.round(num(p, 255)));
  return [r, g, b, alpha];
}

export function toHex([r, g, b]: Rgba): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Mixes `color` over `base` at `amount` (0..1), flattening any alpha onto the base. */
export function mix(color: Rgba, base: Rgba, amount: number): Rgba {
  const a = amount * color[3];
  return [0, 1, 2].map((i) => Math.round(color[i] * a + base[i] * (1 - a))).concat(1) as Rgba;
}
