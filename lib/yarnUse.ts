// How much yarn a pattern needs: a rule of thumb calibrated on real single crochet, shown as "약" with a
// margin, never as an exact amount.
//
// Why not just "stitches x yarn per stitch": the engine's gauge (lib/pattern.ts, kept as the prototype had
// it) makes stitches larger than real ones (5mm hook: 0.95 x 1.0 cm vs ~0.71 x 0.63 cm real), so it counts
// about half the stitches a real piece has. The yarn has to cover the real piece, so it is worked out per
// area instead:
//   real single crochet: width ~0.75, height ~0.63 of the engine's stitch; one stitch takes ~6.5 x its
//   width of yarn (worsted, 5mm hook: ~4.6cm = 1.8in a stitch; 6.5mm: ~7cm)
//   -> yarn per engine stitch = engine area x (6.5 x w_real) / (w_real x h_real) = 10.4 x the engine width
//   a chain uses ~3x its length (2.55 x engine width per engine chain); a handle is a chain worked back in
//   single crochet (+5.5 x)
//   + 10% margin (tails, joins, swatch)
// Check: a 15cm round mini bag, 15cm high, 3mm hook -> ~200m; patterns of that size list 100-200m
// (e.g. a 15.5 x 18.5cm sc mini bag: up to one 80m/100g cotton skein per colour).
// Grams from metres need the yarn's length per 100g:
//   1) the yarn's own label (skeinM / skeinG), only when it is a real yarn's (30-1500 m per 100g);
//      label numbers outside that (a typo, the two fields swapped) are not used - they gave 3600g for a
//      small bag - and the page says so
//   2) else from the thickness in mm (typical lengths: 1mm ~800m, 2mm ~400m, 3mm ~210m, 4mm ~150m,
//      6mm ~100m, 10mm ~45m per 100g, interpolated)
//   3) else from the level (thin 300m, medium 200m, thick 120m)
//   cotton and linen are heavier than wool / acrylic of the same thickness: 0.75x the length per 100g
//   (worsted cotton ~150-170m/100g vs acrylic ~200m) when not from the label
import { CROCHET, type Plan, type Weight } from "./pattern";

export const M_PER_100G: Record<Weight, number> = { thin: 300, medium: 200, thick: 120 };
const BY_MM: [number, number][] = [[1, 800], [2, 400], [3, 210], [4, 150], [6, 100], [10, 45]];
export const LABEL_RANGE: [number, number] = [30, 1500]; // m per 100g a real yarn can have
const SC = 10.4, CH = 2.55, BACK = 5.5, MARGIN = 1.1;
const HEAVY = ["코튼", "리넨", "면", "마"]; // fibres heavier per metre (cotton, linen)

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

export function yarnUse(pp: Plan, d: { weight: Weight | string; yarnMm?: number | null; yarnMode?: string; skeinG?: number | null; skeinM?: number | null; skeins?: number | null; colors?: number; materials?: string[] }): YarnUse {
  const w = pp.g.w;
  let cm = 0;
  for (const r of pp.rows) {
    if (r.part === "start") cm += r.n * CH * w;
    else if (r.part === "handle" && r.grown) cm += r.n * SC * CROCHET[r.grown.st].h * w; // a handle grown out of the opening: rows of its stitch, a taller stitch more yarn
    else if (r.part === "handle") cm += r.n * (CH + BACK) * w; // a chain, then single crochet back along it
    else cm += r.n * SC * w;
  }
  const m = Math.ceil((cm / 100) * MARGIN);
  const fromLabel = d.skeinG && d.skeinM ? (d.skeinM / d.skeinG) * 100 : null;
  const labelOk = fromLabel != null && fromLabel >= LABEL_RANGE[0] && fromLabel <= LABEL_RANGE[1];
  const basis: YarnUse["basis"] = labelOk ? "label" : d.yarnMode !== "level" && d.yarnMm ? "mm" : "level";
  const heavy = basis !== "label" && !!d.materials?.some(x => HEAVY.includes(x));
  const per100 = Math.round((basis === "label" ? (fromLabel as number) : basis === "mm" ? mPer100gFromMm(d.yarnMm as number) : M_PER_100G[d.weight as Weight] ?? 200) * (heavy ? 0.75 : 1));
  const g = Math.ceil((m / per100) * 100);
  // skeins needed: by length when the label gives it, else by weight (only label numbers that make sense)
  const skeins = labelOk || !fromLabel ? (d.skeinM ? Math.ceil(m / d.skeinM) : d.skeinG ? Math.ceil(g / d.skeinG) : null) : null;
  const n = Math.max(1, d.colors ?? 1);
  return { m, g, skeins, perColor: n > 1 ? Math.ceil(m / n) : null, short: skeins != null && d.skeins != null && d.skeins > 0 && d.skeins < skeins,
    per100, basis, labelOdd: fromLabel != null && !labelOk };
}
