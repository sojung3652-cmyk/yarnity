// How much yarn a pattern needs, roughly: every stitch of the plan times the yarn one stitch takes, plus a
// margin. A rule of thumb, not a measurement - shown as "약" with a margin, never as an exact amount.
//   single crochet ~ 4.5 x the stitch width of yarn; a chain ~ 1.6 x (start chains, handle chains)
//   + 10% margin (tails, joins, swatch)
// Grams from metres: the yarn's own label (skeinG / skeinM) when given, else a typical length per 100g for
// its thickness (thin 300m, medium 200m, thick 120m).
import type { Plan, Weight } from "./pattern";

export const M_PER_100G: Record<Weight, number> = { thin: 300, medium: 200, thick: 120 };
const SC = 4.5, CH = 1.6, MARGIN = 1.1;

export interface YarnUse { m: number; g: number; skeins: number | null; perColor: number | null; short: boolean }

export function yarnUse(pp: Plan, d: { weight: Weight | string; skeinG?: number | null; skeinM?: number | null; skeins?: number | null; colors?: number }): YarnUse {
  const w = pp.g.w;
  let cm = 0;
  for (const r of pp.rows) {
    if (r.part === "start") cm += r.n * CH * w;
    else if (r.part === "handle") cm += r.n * (CH + SC) * w; // a chain, then single crochet back along it
    else cm += r.n * SC * w;
  }
  const m = Math.ceil((cm / 100) * MARGIN);
  const per100 = d.skeinG && d.skeinM ? (d.skeinM / d.skeinG) * 100 : M_PER_100G[(d.weight as Weight)] ?? 200;
  const g = Math.ceil((m / per100) * 100);
  // skeins needed: by length when the label gives it, else by weight
  const skeins = d.skeinM ? Math.ceil(m / d.skeinM) : d.skeinG ? Math.ceil(g / d.skeinG) : null;
  const n = Math.max(1, d.colors ?? 1);
  return { m, g, skeins, perColor: n > 1 ? Math.ceil(m / n) : null, short: skeins != null && d.skeins != null && d.skeins > 0 && d.skeins < skeins };
}
