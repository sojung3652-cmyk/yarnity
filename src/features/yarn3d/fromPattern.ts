// A pattern (draft / saved work + its plan) -> the yarn engine's input. Light: no three.js here, so the
// "3D로 보기" buttons and the book's page can decide what to draw without loading the engine.
// Every item 도안 만들기 makes is drawn, in the plan's own counts (lib/pattern.ts):
//   round bottom (+ body)     bottom / body / rim rounds           -> "round" (the bottom rounds lie flat)
//   oval / rect bottom (+ body) base chain `c`, bottom rounds, body -> "oval" / "rect" (worked around the chain)
//   back and forth            n stitches x the "rows" rows         -> "rows" (목도리: knitted, Kim)
//   tube                      n stitches x the "rounds" rounds     -> "tube"
// Not drawn: a bag's flap (덮개; the prototype has nothing for it).
import { CROCHET, paintMask, paintSize, type Plan, type PlanInput } from "@/lib/pattern";
import { hookMmOf } from "@/lib/yarn";
import { isKnit } from "@/lib/knit";
import { compileChart, type Chart, type ChartKey } from "@/lib/crochetChart";
import { chartFor } from "@/lib/stitchCharts";
import { chartFromSteps } from "@/lib/stitchGrammar";
import type { YarnMaterial, YarnPattern, YarnShape } from "./engine";

/** the pattern's own fields the engine reads (Draft and Project both have them) */
export interface YarnSource extends PlanInput {
  /** a crochet stitch pattern drawn as a chart (lib/crochetChart: 부채모양뜨기...) on a flat crocheted piece */
  crochetChart?: ChartKey | null;
  /** a named pattern drawn from its recipe (lib/stitchCharts), for either needle, and the other yarns' colours */
  chartName?: string | null;
  moreColors?: { hex?: string; material?: string; materials?: string[]; held?: boolean; yarnMm?: number | null }[] | null;
  flapShape?: "half" | "square" | "triangle";
  flapOver?: "top" | "fold" | null;
  gusset?: "flat" | "box" | null;
  /** wrist: one loop to slip the hand through (손목 고리) */
  handleKind?: "wrist" | null;
  /** 직접 적기: the reader's own crochet steps, shown when `ownOn` */
  ownSteps?: string | null;
  ownOn?: boolean | null;
  handleCount?: 1 | 2;
  flapColor?: string;
  handleColor?: string;
  item?: string;
  color?: string;
  yarnMm?: number | null;
  materials?: string[];
  /** a knitted item's stitch pattern (lib/knit.ts) */
  stitch?: string | null;
  /** how hairy the yarn is drawn (the reader's own 털 양 / 털 길이; 1 = the material's own) */
  fuzzK?: number | null;
  hairK?: number | null;
  /** strands in a strap (1-5), and things to try on in the 3D */
  handleW?: number | null;
  handleStyle?: "flat-chain" | "flat-rows" | "tube" | null;
  handleWcm?: number | null;
  topGapCm?: number | null;
  topFold?: "spread" | "tuck";
  softK?: number | null;
  extras?: { button?: boolean; label?: boolean; zipper?: boolean; tab?: boolean; items?: { pic: string; at: [number, number, number] }[] } | null;
  /** a band handle's rows of 짧은뜨기 on its chain; the piece left to its own weight (the 3D only) */
  handleRows?: number;
  drape?: boolean;
  /** a drawn bag's depth against its width, bottom to top (from its side view) */
  depthProfile?: number[];
}

// a drawn, rounded bag with no side view: deep at its round bottom, flat higher up, as a round crocheted handbag
// stands (Kim's guide: half-depth : half-width 0.18:0.35 at the bottom, 0.45:1.3 at the widest, 0.38:1.05 at the top)
const DEPTH_DEFAULT = [.51, .42, .37, .35, .35, .35, .36];

// no thickness typed (only thin / medium / thick picked): the middle of each level in lib/yarn.ts
// YARN_MM_LEVELS (thin < 2.5mm, thick > 4mm)
const LEVEL_MM: Record<string, number> = { thin: 2, medium: 3, thick: 5 };
// no colour picked yet: ivory (Kim: unpicked values are drawn as ivory cotton)
export const DEFAULT_COLOR = "#EFE6D4";
// the pattern's yarn material (lib/yarn.ts MATERIALS) -> the engine's look; anything else stays cotton
const MAT: Record<string, YarnMaterial> = {
  코튼: "cotton", 울: "wool", 메리노: "wool", 캐시미어: "cashmere", 아크릴: "wool", 알파카: "alpaca", 모헤어: "mohair", 앙고라: "angora",
  수면사: "sleep", 부클레: "boucle", 수세미실: "scrub", 패브릭얀: "tshirt", 리본얀: "ribbon", 황마: "jute",
  리넨: "linen", 실크: "silk", 대나무: "cotton", 나일론: "nylon", 폴리에스터: "cotton", "벨벳(셔닐)": "chenille",
  라피아: "raffia", 코드사: "cord", 페이크퍼: "fur", 메탈릭: "metal",
};

export function yarn3dSupported(p: PlanInput): boolean {
  return ["coaster", "bag", "rows", "tube"].includes(p.object);
}

/** 직접 적기: the reader's rows on as many stitches as the piece has, as many rows as reach its height (null
 *  when nothing in the text can be read - the picked pattern shows instead) */
function ownChart(p: YarnSource, pp: Plan, counts: (...parts: string[]) => number[]): Chart | null {
  const g = pp.g, cols = Math.min(41, Math.max(7, counts("rows")[0] || Math.round(p.a / g.w))), rows = Math.max(2, Math.min(12, Math.round((p.b ?? p.a) / (g.h * 1.6))));
  return chartFromSteps((p.ownSteps ?? "").split(/\n+/), cols, rows);
}

export function toYarnPattern(p: YarnSource, pp: Plan): YarnPattern | null {
  if (!yarn3dSupported(p) || !pp.rows.length) return null;
  const counts = (...parts: string[]) => pp.rows.filter(r => parts.includes(r.part)).map(r => Math.max(1, Math.round(r.n)));
  let shape: YarnShape, rowColors: (string | undefined)[] | null = null;
  if (p.paint) {
    // a painted picture: its stitches as the pattern counts them, holes and colours as painted
    const { W, H } = paintSize(p.paint, pp.g);
    shape = { kind: "grid", W, H, wCm: p.paint.wCm, hCm: p.paint.hCm, cells: paintMask(p.paint, W, H), pieces: p.paint.pieces ?? 1 };
    rowColors = p.paint.palette.length ? p.paint.palette : null;
  } else if (p.free) {
    // a drawn shape: its rounds as they are, each in the colour drawn at its height
    const rr = pp.rows.filter(r => r.part === "bottom" || r.part === "body"); if (!rr.length) return null;
    shape = { kind: "round", counts: rr.map(r => Math.max(1, Math.round(r.n))), flat: pp.bottomRounds }; rowColors = rr.map(r => r.color);
  } else if (p.object === "rows" && p.ownOn && p.ownSteps && !isKnit(p) && ownChart(p, pp, counts)) {
    // 직접 적기: the reader's own steps, worked out stitch by stitch
    const ch = ownChart(p, pp, counts)!, g = pp.g;
    shape = { kind: "chart", chart: ch, wCm: ch.W * g.w, hCm: ch.H * g.h };
  } else if (p.object === "rows" && p.chartName && chartFor(p.chartName)) {
    // a named pattern (쉐브론, 꽈배기, 페어아일...): its chart, repeated to the piece's size (up to 3 x 3)
    const c0 = chartFor(p.chartName)!, g = pp.g, cols = counts("rows")[0] || Math.round(p.a / g.w), hc = (p.b ?? p.a);
    const ch = tileChart(c0, Math.max(1, Math.min(3, Math.round(cols / c0.W))), Math.max(1, Math.min(3, Math.round(hc / g.h / c0.H))));
    shape = { kind: "chart", chart: ch, wCm: ch.W * g.w, hCm: ch.H * g.h };
  } else if (p.object === "rows" && p.crochetChart && !isKnit(p)) {
    // a crochet stitch pattern: as many stitches across as the piece has (to the pattern's multiple), as many
    // rows as reach its height, each stitch drawn from where it is worked into
    const rows = counts("rows"), g = pp.g, hc = (p.b ?? p.a), k = p.crochetChart;
    const ch = compileChart(k, Math.min(61, Math.max(7, rows[0] || Math.round(p.a / g.w))), Math.max(2, Math.min(14, Math.round(hc / (g.h * 2.05)))));
    shape = { kind: "chart", chart: ch, wCm: ch.W * g.w, hCm: ch.H * g.h };
  } else if (p.object === "rows") {
    const rows = counts("rows"); if (!rows.length) return null;
    shape = { kind: "rows", W: rows[0], H: rows.length, wCm: p.a, hCm: p.b ?? p.a, knit: isKnit(p), stitch: p.stitch ?? undefined };
  } else if (p.object === "tube") {
    const rounds = counts("rounds"); if (!rounds.length) return null;
    shape = { kind: "tube", W: rounds[0], H: rounds.length, circCm: p.a, hCm: p.h ?? 1 };
  } else {
    const bottom = counts("bottom"), body = p.object === "bag" ? counts("body", "rim") : [];
    if (!bottom.length) return null;
    shape = p.shape === "circle" ? { kind: "round", counts: [...bottom, ...body], flat: bottom.length }
      : { kind: p.shape === "oval" ? "oval" as const : "rect" as const, chain: Math.max(2, pp.c), bottom, body };
  }
  // one colour per course: the pattern has one yarn colour (its extra colours are not placed on rows)
  const color = /^#[0-9a-f]{6}$/i.test(p.color ?? "") ? p.color! : DEFAULT_COLOR;
  const handleCm = p.handleCm && p.handleCm > 0 ? p.handleCm : p.handle === "long" ? 90 : 25;
  // one handle across the top (Kim's sketch), or two; older works: a long one is a shoulder strap
  const strap = p.object !== "bag" || !p.handle || p.handle === "none" ? "none" : p.handleKind === "wrist" ? "wrist" as const : p.handleCount === 1 ? "long" : p.handleCount === 2 ? "two" : handleCm >= 60 ? "long" : "two";
  // several materials picked: the one picked last is drawn (so pressing another one shows it at once)
  const material = [...(p.materials ?? [])].reverse().map(m => MAT[m]).find(Boolean) ?? "cotton";
  // a chart's other colours: the other yarns picked, or a lighter and a darker of the main one
  const more = (p.moreColors ?? []).filter(c => !c?.held).map(c => c?.hex).filter((h): h is string => !!h && /^#[0-9a-f]{6}$/i.test(h));
  const colors = rowColors ? rowColors.map(c => c ?? color) : shape.kind === "chart" ? [color, more[0] ?? shade(color, .55), more[1] ?? shade(color, -.45)] : [color];
  return { shape, colors, yarnMm: p.yarnMm || LEVEL_MM[p.weight] || 3, hookMm: hookMmOf(p), strap, strapCm: handleCm, material,
    ...(p.fuzzK != null && p.fuzzK !== 1 ? { fuzzK: p.fuzzK } : {}), ...(p.hairK != null && p.hairK !== 1 ? { hairK: p.hairK } : {}),
    ...(p.free && pp.rows.length && pp.rows[pp.rows.length - 1].n <= 10 ? { firm: true } : {}),
    ...(p.free ? {} : p.item === "pouch" && p.gusset !== "box" && p.flapOver !== "top" ? { top: "pinch" as const } : p.item === "bucket" ? { top: "cinch" as const } : {}),
    // with a flap the top closes to the gap asked (2cm when not said)
    ...(p.softK && p.softK !== 1 ? { softK: p.softK } : {}),
    // 합사 (Kim): the first added yarn held together with the main one - its colour twists in, its fibres show
    ...((h => h ? { marl: h.hex, marlShare: (h.yarnMm && h.yarnMm > 0 ? h.yarnMm : (p.yarnMm || 3)) / ((p.yarnMm || 3) + (h.yarnMm && h.yarnMm > 0 ? h.yarnMm : (p.yarnMm || 3))), ...((m => m && MAT[m] ? { marlMat: MAT[m] } : {})(h.materials?.length ? h.materials[h.materials.length - 1] : h.material)) } : {})((p.moreColors ?? []).find(c => c?.held && !!c.hex && /^#[0-9a-f]{6}$/i.test(c.hex)))),
    ...(p.object === "bag" && p.flapCm && p.flapCm > 0 && p.flapOver !== "top" ? { topGap: p.topGapCm ?? 2 } : {}), ...(p.topFold === "tuck" ? { topFold: "tuck" as const } : {}),
    // a handle is flat or a tube (Kim: no strands): flat when not said
    ...(p.object === "bag" && p.handle && p.handle !== "none" && !p.handleStyle ? { strapStyle: "flat-rows" as const, strapWcm: p.handleWcm ?? 2.5 } : {}),
    ...(p.object === "bag" && p.flapCm && p.flapCm > 0 ? { flap: { cm: p.flapCm, shape: p.flapShape ?? "half", ...(p.flapOver === "top" ? { over: true } : {}), ...(p.flapColor ? { color: p.flapColor } : {}) } } : {}),
    ...(p.crochetStitch && p.crochetStitch !== "sc" ? { stitchH: CROCHET[p.crochetStitch].h } : {}),
    ...(p.crochetStitch === "blo" ? { ridge: true } : {}),
    ...(p.handleColor && p.handle !== "none" ? { strapColor: p.handleColor } : {}),
    ...(p.drape ? { gravity: true } : {}),
    ...(p.handleW && p.handleW !== 3 ? { strapW: p.handleW } : {}), ...(p.handleStyle ? { strapStyle: p.handleStyle, strapWcm: p.handleWcm ?? 2.5 } : {}), ...(p.extras && (p.extras.button || p.extras.label || p.extras.zipper || p.extras.tab || p.extras.items?.length) ? { extras: p.extras } : {}),
    // a drawn silhouette (lib/sketchMeasure): pressed to its depth, its opening edged
    ...(p.object === "bag" && p.profile && p.profile.length >= 2 && !p.free ? { depth: p.depthProfile ?? DEPTH_DEFAULT, rim: true,
      ...(p.profile[0] > 0 && p.h ? { outline: { prof: p.profile, a: p.a, h: p.h, depth: p.depthProfile ?? DEPTH_DEFAULT, bottom: pp.bottomRounds, rounds: pp.bottomRounds + pp.bodyRows } } : {}) } : {}) };
}

/** a chart repeated nx across and ny up */
function tileChart(c: Chart, nx: number, ny: number): Chart {
  if (nx === 1 && ny === 1) return c;
  const out: Chart = { st: [], ch: [], W: c.W * nx, H: c.H * ny };
  for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) {
    const dx = a * c.W, dy = b * c.H;
    c.st.forEach(s => out.st.push({ ...s, b: [s.b[0] + dx, s.b[1] + dy], t: [s.t[0] + dx, s.t[1] + dy] }));
    c.ch.forEach(q => out.ch.push([q[0] + dx, q[1] + dy, q[2] ?? 0]));
  }
  return out;
}
/** a colour mixed towards white (k > 0) or a deep brown (k < 0) */
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16), to = k > 0 ? [250, 246, 238] : [52, 38, 34], f = Math.abs(k);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (to[i] - v) * f));
  // a colour already near white goes darker instead, so the second colour always shows
  if (k > 0 && (n >> 16) + ((n >> 8) & 255) + (n & 255) > 600) return shade(hex, -.4);
  return "#" + ch.map(v => v.toString(16).padStart(2, "0")).join("");
}
