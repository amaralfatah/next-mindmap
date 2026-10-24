import { isBranchColor } from "@/lib/model";

const LIGHT_BRANCHES = new Set(["ochre", "moss"]);

export function branchVar(color: string | null): string {
  return color ? `var(--branch-${color})` : "var(--foreground)";
}

export function resolveNodeColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  if (isBranchColor(color)) return `var(--branch-${color})`;
  return color;
}

export function getContrastTextColor(fillColor: string | undefined): string | undefined {
  if (!fillColor) return undefined;
  // Yellow and green pigments are too light for white text.
  if (isBranchColor(fillColor)) return LIGHT_BRANCHES.has(fillColor) ? "#1a1a19" : "#ffffff";
  if (fillColor.startsWith("#")) {
    let hex = fillColor.slice(1);
    if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 170 ? "#1e293b" : "#ffffff";
    }
  }
  return "#ffffff";
}
