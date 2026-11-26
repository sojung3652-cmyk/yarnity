// A pattern (draft / saved work + its plan) -> the yarn engine's input. Light: no three.js here, so the
// "3D로 보기" buttons and the book's page can decide what to draw without loading the engine.
// Every item 도안 만들기 makes is drawn, in the plan's own counts (lib/pattern.ts):
//   round bottom (+ body)     bottom / body / rim rounds           -> "round" (the bottom rounds lie flat)
//   oval / rect bottom (+ body) base chain `c`, bottom rounds, body -> "oval" / "rect" (worked around the chain)
//   back and forth            n stitches x the "rows" rows         -> "rows" (목도리: knitted, Kim)
//   tube                      n stitches x the "rounds" rounds     -> "tube"
// Not drawn: a bag's flap (덮개; the prototype has nothing for it).
import { isChainRow, pieceLayout, pieceOf } from "@/lib/structure";
import { CROCHET, NET, RING_CM, grownHandle, netArch, openingN, PACK_STRAP, plan, paintMask, paintSize, pliedMm, pliesOf, type Plan, type PlanInput } from "@/lib/pattern";
import { isWear } from "@/lib/wear";
import { bottleProfile, wornForm } from "./worn";
import { hookMmOf } from "@/lib/yarn";
import { isKnit } from "@/lib/knit";
import { compileChart, type Chart, type ChartKey } from "@/lib/crochetChart";
import { chartFor } from "@/lib/stitchCharts";
import { chartFromSteps } from "@/lib/stitchGrammar";
import type { WallStitch, YarnMaterial, YarnPattern, YarnShape, YarnStand } from "./engine";

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
  handleKind?: "wrist" | "grown" | "rim" | null;
  handleBaseCm?: number | null;
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
  라피아: "raffia", 코드사: "cord", 페이크퍼: "fur", 메탈사: "metal", 메탈릭: "metal", // 메탈릭: its name before (saved works)
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

/** 구조 부품 (lib/structure) as the piece they make, for the 3D: two panels with a strip between them stand as a
 *  box as wide as the panel, as deep as the strip, as tall as the panel - the strip its handle when it goes on
 *  as one; a hobo's two panels joined stand as a flat bag, its posts the strap from end to end. (The 3D shows the
 *  finished form; the rows it is made of are the pattern's and the symbol chart's.) */
function builtAs(p: YarnSource, pp: Plan): YarnSource {
  const g = pp.g, one = { build: undefined, handleKind: undefined, handleCount: 1 as const, handleStyle: "flat-rows" as const, flapCm: null };
  if (p.build === "panels") {
    const sw = p.stripCm && p.stripCm > 0 ? p.stripCm : 6, ring = !!p.stripHandle && p.handle !== "none";
    return { ...p, build: undefined, shape: "rect", b: sw, gusset: "box", ...(ring ? { ...one, handle: "short", handleWcm: sw, handleCm: p.handleCm && p.handleCm > 0 ? p.handleCm : 50 } : {}) };
  }
  const post = pp.rows.find(r => r.post != null)?.n ?? 5;
  return { ...p, ...one, shape: (p.corner ?? 0) >= .5 ? "oval" : "rect", b: 2, gusset: "flat", handle: "short", handleWcm: Math.max(1, post * g.w), handleCm: p.strapCm && p.strapCm > 0 ? p.strapCm : 60 };
}

export function toYarnPattern(p: YarnSource, pp: Plan): YarnPattern | null {
  if (!yarn3dSupported(p) || !pp.rows.length) return null;
  if (p.object === "bag" && (p.build === "panels" || p.build === "hobo1") && !p.free && !p.paint) { const q = builtAs(p, pp); return toYarnPattern(q, plan(q as PlanInput)); }
  const counts = (...parts: string[]) => pp.rows.filter(r => parts.includes(r.part)).map(r => Math.max(1, Math.round(r.n)));
  let shape: YarnShape, rowColors: (string | undefined)[] | null = null, stand: YarnStand | null = null, seam = false, tones: ("main" | "second" | "seam")[] | null = null;
  // 모자·후드 기본형 (lib/wear): set on a head as it is worn, every stitch of the plan's rows in its place
  const worn = isWear(p.item) && !p.paint && !p.free ? wornForm(p, pp) : null;
  if (worn) { shape = { kind: "form", key: worn.key, courses: worn.courses, size: worn.size }; stand = worn.stand; seam = !!worn.seam; tones = worn.tones ?? null; }
  else if (p.paint) {
    // a painted picture: its stitches as the pattern counts them, holes and colours as painted
    const { W, H } = paintSize(p.paint, pp.g);
    shape = { kind: "grid", W, H, wCm: p.paint.wCm, hCm: p.paint.hCm, cells: paintMask(p.paint, W, H), pieces: p.paint.pieces ?? 1 };
    rowColors = p.paint.palette.length ? p.paint.palette : null;
  } else if (p.free) {
    // a drawn shape: its rounds as they are, each in the colour drawn at its height
    const rr = pp.rows.filter(r => r.part === "bottom" || r.part === "body"); if (!rr.length) return null;
    shape = { kind: "round", counts: rr.map(r => Math.max(1, Math.round(r.n))), flat: pp.bottomRounds }; rowColors = rr.map(r => r.color);
  } else if (p.object === "bag" && p.build === "ribbed") {
    // 골지 판 (lib/structure): a panel worked sideways - its rows stand upright in the piece (`turn`), so its ribs
    // run up it; the hand's hole is the grid's own gap; two panels, front and back
    const body = pp.rows.filter(r => r.part === "panel" && pieceOf(r) === "앞판" && !isChainRow(r)), lay = pieceLayout(body);
    shape = { kind: "grid", W: lay.W, H: body.length, wCm: lay.W * pp.g.w, hCm: body.length * pp.g.h, cells: lay.cells, pieces: 2, turn: true };
  } else if (p.object === "rows" && p.taper && !isKnit(p) && pp.rows.some(r => r.edge)) {
    // 사선 / 삼각형 (lib/structure): the piece as its rows lie - the grid the symbol chart draws, stitch for stitch
    const body = pp.rows.filter(r => !isChainRow(r) && r.part !== "finish"), lay = pieceLayout(body);
    shape = { kind: "grid", W: lay.W, H: body.length, wCm: lay.W * pp.g.w, hCm: body.length * pp.g.h, cells: lay.cells, pieces: 1 };
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
    // a stitch pattern's taller rounds (Row.hk ~2 for 한길긴뜨기) drawn as as many rounds, so the body keeps its height
    // (handles left standing in the rim's rounds - a net bag - add their chains to those rounds' counts: the rim is drawn as wide as the body's last round)
    const bodyTop = pp.rows.filter(r => r.part === "body").pop()?.n ?? 0;
    const bottom = counts("bottom"), body = p.object === "bag" ? drawnRounds(pp.rows.filter(r => r.part === "body" || r.part === "rim")).map(x => (p.handleKind === "rim" && bodyTop ? Math.min(x.n, bodyTop) : x.n)) : [];
    if (!bottom.length) return null;
    shape = p.shape === "circle" ? { kind: "round", counts: [...bottom, ...body], flat: bottom.length }
      : { kind: p.shape === "oval" ? "oval" as const : "rect" as const, chain: Math.max(2, pp.c), bottom, body };
  }
  // one colour per course: the pattern has one yarn colour (its extra colours are not placed on rows)
  const color = /^#[0-9a-f]{6}$/i.test(p.color ?? "") ? p.color! : DEFAULT_COLOR;
  const handleCm = p.handleCm && p.handleCm > 0 ? p.handleCm : p.handle === "long" ? 90 : 25;
  // one handle across the top (Kim's sketch), or two; older works: a long one is a shoulder strap
  // a handle grown out of the opening (lib/pattern grownHandle): one over the top, its foot's share of the round
  // and how much of each half narrows from the plan's own counts
  const rimN = openingN(pp);
  const GH = p.object === "bag" && p.handle && p.handle !== "none" && p.handleKind === "grown" && rimN ? grownHandle(p, pp.g, rimN) : null;
  const strap = p.item === "backpack" && p.object === "bag" && !p.free ? "pack" as const : p.object !== "bag" || !p.handle || p.handle === "none" ? "none" : p.handleKind === "wrist" ? "wrist" as const : GH || p.handleCount === 1 ? "long" : p.handleCount === 2 ? "two" : handleCm >= 60 ? "long" : "two";
  // several materials picked: the one picked last is drawn (so pressing another one shows it at once)
  const material = [...(p.materials ?? [])].reverse().map(m => MAT[m]).find(Boolean) ?? "cotton";
  // a chart's other colours: the other yarns picked, or a lighter and a darker of the main one
  const more = (p.moreColors ?? []).filter(c => !c?.held).map(c => c?.hex).filter((h): h is string => !!h && /^#[0-9a-f]{6}$/i.test(h));
  // (a motif hat's seams: the next yarn picked, or the yarn's own colour a tone deeper - Kim: 모티프 경계가 보이게)
  const colors = rowColors ? rowColors.map(c => c ?? color) : shape.kind === "chart" ? [color, more[0] ?? shade(color, .55), more[1] ?? shade(color, -.45)] : tones ? tones.map(t => (t === "main" ? color : t === "second" ? more[0] ?? shade(color, .55) : shade(color, -.3))) : seam ? [color, more[0] ?? shade(color, -.3)] : [color];
  // 보틀백 (Kim: 병 모양 받침 위에): the bottle it is made for stands in it, drawn to the bag's own width
  if (p.item === "bottlebag" && p.object === "bag" && !p.free) { const d = p.bottleD && p.bottleD > 0 ? p.bottleD : Math.max(2, p.a - 1), h = p.bottleH && p.bottleH > 0 ? p.bottleH : (p.h ?? 16) / .75; stand = { kind: "bottle", prof: bottleProfile(d / 2, h), fitTo: d }; }
  const pack = p.item === "backpack" && p.object === "bag" && !p.free;
  // the stitch pattern picked, on a bag's body (the bottom stays plain, as it is worked)
  // (an edging round in a stitch pattern - 폰 크로스백: that round alone in its own stitches)
  const wc = p.object === "bag" && !p.free && !isKnit(p) && !worn ? (p.crochetChart ? wallOfRounds(p.crochetChart, pp, netArch(p)) : p.rimChart && pp.rows.some(r => r.part === "rim" && r.wall) ? wallOfRounds(p.rimChart, pp)
    : p.chartName && chartFor(p.chartName) ? wallOfChart(chartFor(p.chartName)!) : null) : null;
  const wall = wc ? { ...wc, colors: [color, more[0] ?? shade(color, .55), more[1] ?? shade(color, -.45)] } : null;
  // 메탈사 held two or three strands together (Kim): the yarn drawn as thick as the strands make it
  const br = Math.max(0, Math.min(1, p.brush ?? 0));
  // 사선 / 삼각형 덮개 (lib/structure): how wide it still is at its end, from the pattern's own rows
  const flapRows = pp.rows.filter(r => r.part === "flap"), flapTip = flapRows.length ? flapRows[flapRows.length - 1].n / Math.max(1, flapRows[0].n) : 1;
  // 계단 덮개 (lib/pattern): how many times it steps in
  const stairs = flapRows.filter(r => r.step).length;
  const mm0 = p.yarnMm || LEVEL_MM[p.weight] || 3, yarnMm = pliesOf(p) > 1 ? pliedMm(mm0, pliesOf(p)) : mm0;
  return { shape, colors, yarnMm, hookMm: hookMmOf(p), strap, strapCm: pack ? (p.tieCm && p.tieCm > 0 ? p.tieCm : PACK_STRAP) : GH ? GH.lenCm : handleCm, material,
    ...(stand ? { stand } : {}),
    // 링 손잡이백: its two rings, the top drawn together under them; 코인 미니백 / a clutch's chain: a small loop at each side
    ...(p.item === "ringbag" && p.object === "bag" && !p.free ? { rings: { cm: p.ringCm && p.ringCm > 0 ? p.ringCm : RING_CM }, topGap: 1.5 } : {}),
    ...(p.object === "bag" && !p.free && !worn && (p.item === "coinbag" || p.chainLoops) ? { sideLoops: true } : {}),
    // 브러싱 (Kim): the finished piece brushed - more hair and longer by how hard it is brushed, on top of the
    // reader's own 털 양 / 털 길이 (a smooth yarn gets fuzz too: above 1 the 3D adds it)
    ...(br > 0 || (p.fuzzK != null && p.fuzzK !== 1) ? { fuzzK: (p.fuzzK ?? 1) + br * 3 } : {}), ...(br > 0 || (p.hairK != null && p.hairK !== 1) ? { hairK: (p.hairK ?? 1) * (1 + br * 1.5) } : {}),
    // (a bottle's bag is held in shape by its bottle)
    ...((p.free && pp.rows.length && pp.rows[pp.rows.length - 1].n <= 10) || (stand?.kind === "bottle") ? { firm: true } : {}),
    ...(p.free ? {} : p.item === "pouch" && p.gusset !== "box" && p.flapOver !== "top" ? { top: "pinch" as const } : p.item === "bucket" || pack ? { top: "cinch" as const } : {}),
    // with a flap the top closes to the gap asked (2cm when not said)
    ...(p.softK && p.softK !== 1 ? { softK: p.softK } : {}),
    // 합사 (Kim): the first added yarn held together with the main one - its colour twists in, its fibres show
    ...((h => h ? { marl: h.hex, marlShare: (h.yarnMm && h.yarnMm > 0 ? h.yarnMm : (p.yarnMm || 3)) / ((p.yarnMm || 3) + (h.yarnMm && h.yarnMm > 0 ? h.yarnMm : (p.yarnMm || 3))), ...((m => m && MAT[m] ? { marlMat: MAT[m] } : {})(h.materials?.length ? h.materials[h.materials.length - 1] : h.material)) } : {})((p.moreColors ?? []).find(c => c?.held && !!c.hex && /^#[0-9a-f]{6}$/i.test(c.hex)))),
    ...(p.object === "bag" && p.flapCm && p.flapCm > 0 && !GH && p.flapOver !== "top" ? { topGap: p.topGapCm ?? 2 } : {}), ...(p.topFold === "tuck" ? { topFold: "tuck" as const } : {}),
    // a handle is flat or a tube (Kim: no strands): flat when not said
    ...(p.object === "bag" && p.handle && p.handle !== "none" && !p.handleStyle && !pack ? { strapStyle: "flat-rows" as const, strapWcm: p.handleWcm ?? 2.5 } : {}),
    ...(p.object === "bag" && p.flapCm && p.flapCm > 0 && !GH ? { flap: { cm: p.flapCm, shape: p.taper === "both" ? "triangle" as const : p.taper === "left" ? "slant-l" as const : p.taper === "right" ? "slant-r" as const : p.flapShape ?? "half", ...(p.taper ? { tip: flapTip } : {}), ...(stairs ? { shape: "square" as const, tip: flapTip, steps: stairs } : {}), ...(p.flapOver === "top" ? { over: true } : {}), ...(p.flapColor ? { color: p.flapColor } : {}) } } : {}),
    ...(p.crochetStitch && p.crochetStitch !== "sc" ? { stitchH: CROCHET[p.crochetStitch].h } : {}),
    ...(p.crochetStitch === "blo" || (p.object === "bag" && p.build === "ribbed") ? { ridge: true } : {}),
    ...(wall ? { wall } : {}),
    ...(p.handleColor && p.handle !== "none" ? { strapColor: p.handleColor } : {}),
    ...(p.drape ? { gravity: true } : {}),
    ...(p.handleW && p.handleW !== 3 ? { strapW: p.handleW } : {}), ...(p.handleStyle ? { strapStyle: p.handleStyle, strapWcm: p.handleWcm ?? 2.5 } : {}), ...(p.extras && (p.extras.button || p.extras.label || p.extras.zipper || p.extras.tab || p.extras.items?.length) ? { extras: p.extras } : {}),
    ...(GH ? { strapStyle: "flat-rows" as const, strapWcm: GH.strap * pp.g.w, strapGrown: { foot: GH.base / rimN, dec: GH.dec / GH.rows } } : {}),
    // a drawn silhouette: pressed to its depth, its opening edged
    ...(p.object === "bag" && p.profile && p.profile.length >= 2 && !p.free ? { depth: p.depthProfile ?? DEPTH_DEFAULT, rim: true,
      ...(p.profile[0] > 0 && p.h ? { outline: { prof: p.profile, a: p.a, h: p.h, depth: p.depthProfile ?? DEPTH_DEFAULT, bottom: pp.bottomRounds, rounds: pp.bottomRounds + pp.bodyRows } } : {}) } : {}) };
}

// a stitch pattern on a bag's body (Kim: 모양 만들었을 때 무늬를 표시): each pattern's repeat as the stitch in each
// cell, bottom row first - read from how each is written (lib/crochetChart CHART_ROWS). A shell's five 한길긴뜨기
// rise from one stitch, so they are drawn falling off to 긴뜨기 at its edges, the fan's outline
const WALL: Record<ChartKey, WallStitch[][]> = {
  shell: [["sc", "hdc", "dc", "dc", "dc", "hdc"], ["dc", "dc", "hdc", "sc", "hdc", "dc"]],
  mesh: [["dc", "ch"]],
  vst: [["dc", "ch", "dc"]],
  moss: [["sc", "ch"], ["ch", "sc"]],
  net: [["sc", "ch", "ch", "ch"], ["ch", "ch", "sc", "ch"]],
};
const WALL_OF: Partial<Record<string, WallStitch>> = { sc: "sc", sl: "sc", crab: "sc", loop: "sc", picot: "sc", bar: "sc", hdc: "hdc", dc: "dc", tr: "tr", dtr: "tr", bob: "pop", puff: "pop", pop: "pop", cl: "pop", bull: "pop", yo: "ch" };
/** the body's rounds as drawn: a round hk times as tall as a single-crochet round is drawn as that many (the
 *  heights added up, so 2.05-high rounds give 2, 2, 2, ... and now and then a 3rd) */
function drawnRounds(rows: Plan["rows"]): { n: number; at: number }[] {
  const out: { n: number; at: number }[] = []; let acc = 0;
  rows.forEach((r, i) => { acc += r.hk ?? 1; const want = Math.max(out.length + 1, Math.round(acc)); while (out.length < want) out.push({ n: Math.max(1, Math.round(r.n)), at: i }); });
  return out;
}
/** a picked pattern on the body, round by round as drawn: the evening round and the rim plain, each pattern
 *  round its repeat row (shell: the fans, then the fans half a repeat over...) */
function wallOfRounds(k: ChartKey, pp: Plan, arch = 5): { W: number; H: number; t: WallStitch[][] } {
  // (a net of 3 or 7 chains - lib/pattern NET: a 짧은뜨기 and chains over its own multiple, the next round half over)
  const cell = k === "net" && arch !== 5 ? [0, Math.floor(NET[arch].m / 2)].map(o => Array.from({ length: NET[arch].m }, (_, i): WallStitch => (i === o ? "sc" : "ch"))) : WALL[k];
  const rows = pp.rows.filter(r => r.part === "body" || r.part === "rim"), W = cell[0].length, plain = Array<WallStitch>(W).fill("sc");
  let pi = 0; const pat = rows.map(r => r.hk ? cell[pi++ % cell.length] : plain);
  const t = drawnRounds(rows).map(x => pat[x.at]);
  return { W, H: t.length, t };
}

/** a chart built on a grid (lib/stitchCharts: each stitch with its cell) as a repeat for the body; null for a
 *  knitted one (its knit and purl are drawn by the knitting engine, not round a crocheted bag) */
function wallOfChart(ch: Chart): { W: number; H: number; t: WallStitch[][]; c: number[][] } | null {
  const gs = ch.st.filter(s => s.g); if (!gs.length || gs.some(s => s.type === "k" || s.type === "p")) return null;
  const W = Math.max(...gs.map(s => s.g![0])) + 1, H = Math.max(...gs.map(s => s.g![1])) + 1; if (W < 1 || H < 1 || W > 80 || H > 40) return null;
  const t: WallStitch[][] = Array.from({ length: H }, () => Array<WallStitch>(W).fill("ch")), c = Array.from({ length: H }, () => Array<number>(W).fill(0));
  gs.forEach(s => { const [i, j] = s.g!; t[j][i] = WALL_OF[s.type] ?? "sc"; c[j][i] = s.c ?? 0; });
  return { W, H, t, c };
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
