// How much yarn a pattern needs, roughly: every stitch of the plan times the yarn one stitch takes, plus a
// margin. A rule of thumb, not a measurement - shown as "약" with a margin, never as an exact amount.
//   single crochet ~ 4.5 x the stitch width of yarn; a chain ~ 1.6 x (start chains, handle chains)
//   + 10% margin (tails, joins, swatch)
// Grams from metres need the yarn's length per 100g:
//   1) the yarn's own label (skeinM / skeinG), only when it is a real yarn's (30-1500 m per 100g);
//      label numbers outside that (a typo, the two fields swapped) are not used - they gave 3600g for a
//      small bag - and the page says so
//   2) else from the thickness in mm (typical lengths: 1mm ~800m, 2mm ~400m, 3mm ~200m, 4mm ~130m,
//      6mm ~80m, 10mm ~40m per 100g, interpolated)
//   3) else from the level (thin 300m, medium 200m, thick 120m)
import type { Plan, Weight } from "./pattern";

export const M_PER_100G: Record<Weight, number> = { thin: 300, medium: 200, thick: 120 };
const BY_MM: [number, number][] = [[1, 800], [2, 400], [3, 200], [4, 130], [6, 80], [10, 40]];
export const LABEL_RANGE: [number, number] = [30, 1500]; // m per 100g a real yarn can have
const SC = 4.5, CH = 1.6, MARGIN = 1.1;

/** Typical length per 100g for a yarn this thick (mm), interpolated on a log scale. */
export function mPer100gFromMm(mm: number) {
  if (mm <= BY_MM[0][0]) return BY_MM[0][1];
  for (let i = 1; i < BY_MM.length; i++) {
    const [x0, y0] = BY_MM[i - 1], [x1, y1] = BY_MM[i];
    if (mm <= x1) { const t = Math.log(mm / x0) / Math.log(x1 / x0); return Math.round(y0 * Math.pow(y1 / y0, t)); }
  }
  return BY_MM[BY_MM.length - 1][1];
}

export interface YarnUse {
  m: number; g: number; skeins: number | null; perColor: number | null; short: boolean;
  /** the length per 100g used, where it came from, and whether the label's numbers were left out */
  per100: number; basis: "label" | "mm" | "level"; labelOdd: boolean;
}

export function yarnUse(pp: Plan, d: { weight: Weight | string; yarnMm?: number | null; yarnMode?: string; skeinG?: number | null; skeinM?: number | null; skeins?: number | null; colors?: number }): YarnUse {
  const w = pp.g.w;
  let cm = 0;
  for (const r of pp.rows) {
    if (r.part === "start") cm += r.n * CH * w;
    else if (r.part === "handle") cm += r.n * (CH + SC) * w; // a chain, then single crochet back along it
    else cm += r.n * SC * w;
  }
  const m = Math.ceil((cm / 100) * MARGIN);
  const fromLabel = d.skeinG && d.skeinM ? (d.skeinM / d.skeinG) * 100 : null;
  const labelOk = fromLabel != null && fromLabel >= LABEL_RANGE[0] && fromLabel <= LABEL_RANGE[1];
  const basis: YarnUse["basis"] = labelOk ? "label" : d.yarnMode !== "level" && d.yarnMm ? "mm" : "level";
  const per100 = Math.round(basis === "label" ? (fromLabel as number) : basis === "mm" ? mPer100gFromMm(d.yarnMm as number) : M_PER_100G[d.weight as Weight] ?? 200);
  const g = Math.ceil((m / per100) * 100);
  // skeins needed: by length when the label gives it, else by weight (only label numbers that make sense)
  const skeins = labelOk || !fromLabel ? (d.skeinM ? Math.ceil(m / d.skeinM) : d.skeinG ? Math.ceil(g / d.skeinG) : null) : null;
  const n = Math.max(1, d.colors ?? 1);
  return { m, g, skeins, perColor: n > 1 ? Math.ceil(m / n) : null, short: skeins != null && d.skeins != null && d.skeins > 0 && d.skeins < skeins,
    per100, basis, labelOdd: fromLabel != null && !labelOk };
}
