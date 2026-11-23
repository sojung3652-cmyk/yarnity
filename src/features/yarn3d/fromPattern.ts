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
import { compileChart, type ChartKey } from "@/lib/crochetChart";
import type { YarnMaterial, YarnPattern, YarnShape } from "./engine";

/** the pattern's own fields the engine reads (Draft and Project both have them) */
export interface YarnSource extends PlanInput {
  /** a crochet stitch pattern drawn as a chart (lib/crochetChart: 부채모양뜨기...) on a flat crocheted piece */
  crochetChart?: ChartKey | null;
  flapShape?: "half" | "square" | "triangle";
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
  extras?: { button?: boolean; label?: boolean; zipper?: boolean; tab?: boolean } | null;
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
  리넨: "linen", 실크: "silk", 대나무: "silk", 나일론: "cord", 폴리에스터: "silk", "벨벳(셔닐)": "chenille",
  라피아: "raffia", 코드사: "cord", 페이크퍼: "fur", 메탈릭: "metal",
};

export function yarn3dSupported(p: PlanInput): boolean {
  return ["coaster", "bag", "rows", "tube"].includes(p.object);
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
  const strap = p.object !== "bag" || !p.handle || p.handle === "none" ? "none" : p.handleCount === 1 ? "long" : p.handleCount === 2 ? "two" : handleCm >= 60 ? "long" : "two";
  // several materials picked: the one picked last is drawn (so pressing another one shows it at once)
  const material = [...(p.materials ?? [])].reverse().map(m => MAT[m]).find(Boolean) ?? "cotton";
  return { shape, colors: rowColors ? rowColors.map(c => c ?? color) : [color], yarnMm: p.yarnMm || LEVEL_MM[p.weight] || 3, hookMm: hookMmOf(p), strap, strapCm: handleCm, material,
    ...(p.fuzzK != null && p.fuzzK !== 1 ? { fuzzK: p.fuzzK } : {}), ...(p.hairK != null && p.hairK !== 1 ? { hairK: p.hairK } : {}),
    ...(p.free && pp.rows.length && pp.rows[pp.rows.length - 1].n <= 10 ? { firm: true } : {}),
    ...(p.free ? {} : p.item === "pouch" ? { top: "pinch" as const } : p.item === "bucket" ? { top: "cinch" as const } : {}),
    ...(p.object === "bag" && p.flapCm && p.flapCm > 0 ? { flap: { cm: p.flapCm, shape: p.flapShape ?? "half", ...(p.flapColor ? { color: p.flapColor } : {}) } } : {}),
    ...(p.crochetStitch && p.crochetStitch !== "sc" ? { stitchH: CROCHET[p.crochetStitch].h } : {}),
    ...(p.handleColor && p.handle !== "none" ? { strapColor: p.handleColor } : {}),
    ...(p.drape ? { gravity: true } : {}),
    ...(p.handleW && p.handleW !== 3 ? { strapW: p.handleW } : {}), ...(p.handleStyle ? { strapStyle: p.handleStyle, strapWcm: p.handleWcm ?? 2.5 } : {}), ...(p.extras && (p.extras.button || p.extras.label || p.extras.zipper || p.extras.tab) ? { extras: p.extras } : {}),
    // a drawn silhouette (lib/sketchMeasure): pressed to its depth, its opening edged
    ...(p.object === "bag" && p.profile && p.profile.length >= 2 && !p.free ? { depth: p.depthProfile ?? DEPTH_DEFAULT, rim: true,
      ...(p.profile[0] > 0 && p.h ? { outline: { prof: p.profile, a: p.a, h: p.h, depth: p.depthProfile ?? DEPTH_DEFAULT, bottom: pp.bottomRounds, rounds: pp.bottomRounds + pp.bodyRows } } : {}) } : {}) };
}
