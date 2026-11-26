// Stitch / row calculation engine. Pure functions, no DOM.
// Ported 1:1 from the prototype (legacy/index.html, "ENGINE" section).
// tests/pattern.test.ts checks every output against a verbatim copy of the original,
// so keep the arithmetic (including rnd()'s toFixed(6) rounding) exactly as is.

import { planKnitFold, planKnitTop } from "./knitwear";
import { edgeRows, planHobo, planPanels, planRibbed, planTaper, taperFlap, taperNote } from "./structure";
import { planBalaclava, planBonnet, planBucketHat, planBustier, planEarflap, planHalter, planHoodScarf, planKerchief, planKnotBag, planMotifHat, planMotifScarf, planMoonBag, planBigSocks, planTrapBag, planTwoWay } from "./wear";
import { CHART_MULT, type ChartKey } from "./crochetChart";
import { PATTERN_BY_ID, STITCH_PATTERNS, type Rep } from "./stitchPatterns";

export type HookKey = "2호" | "3호" | "4호" | "5호" | "6호" | "7호" | "8호" | "10호";
export type Weight = "thin" | "medium" | "thick";
export type Shape = "circle" | "oval" | "rect";
/** The engine path: "coaster" = round/oval/rect bottom only, "bag" = bottom + body (+ rim, handle),
 *  "rows" = a flat piece worked back and forth, "tube" = a ring worked in the round without a bottom.
 *  (The 19 items in lib/items.ts map onto these four.) */
export type ObjectKind = "coaster" | "bag" | "rows" | "tube";
export type Handle = "short" | "long" | "none";
export type Part = "bottom" | "body" | "rim" | "flap" | "handle" | "start" | "rows" | "rounds"
  // 구조 부품 (lib/structure): a flat panel, the strip between two panels, joining, a cord or a strap grown from a few stitches, what is done after the last stitch
  | "panel" | "strip" | "join" | "strap" | "finish";

export const HOOKS: [HookKey, number][] = [["2호", 2.0], ["3호", 2.3], ["4호", 2.5], ["5호", 3.0], ["6호", 3.5], ["7호", 4.0], ["8호", 5.0], ["10호", 6.0]];
export const HOOK_MM: Record<string, number> = Object.fromEntries(HOOKS);
export const YARN: Record<Weight, number> = { thin: 0.9, medium: 1.0, thick: 1.15 };
export const YARN_KO: Record<Weight, string> = { thin: "가는 실", medium: "보통", thick: "굵은 실" };
export const SHAPE_KO: Record<Shape, string> = { circle: "원형", oval: "타원", rect: "사각" };
export const PART_KO: Record<Part, string> = { bottom: "바닥", body: "몸통", rim: "테두리", flap: "덮개", handle: "손잡이", start: "시작 사슬", rows: "왕복뜨기", rounds: "둘레뜨기", panel: "판", strip: "띠", join: "잇기", strap: "끈", finish: "마무리" };

/** what a piece calls its parts when they are not a bag's (Kim: 모자·소품 기본형 - a hat has no 바닥): by item */
export const WEAR_PARTS: Record<string, Partial<Record<Part, string>>> = {
  buckethat: { bottom: "정수리", body: "옆", rim: "챙", join: "챙 잇기" },
  motifhat: { panel: "모티프", join: "잇기" },
  hoodscarf: { bottom: "정수리", panel: "후드", strap: "스카프 끈" },
  earflap: { panel: "후드", strap: "귀덮개", join: "정수리 잇기", rim: "앞선" },
  kerchief: { rows: "삼각형", handle: "묶는 끈" },
  bottlebag: { handle: "끈" },
  backpack: { handle: "고리와 끈" },
  trapbag: { handle: "손잡이" },
  moonbag: { panel: "원" },
  stepbag: { flap: "계단 덮개", handle: "어깨끈" },
  phonebag: { handle: "끈" },
  bonnet: { bottom: "정수리", panel: "뒤통수", handle: "턱끈" },
  bustier: { panel: "모티프", join: "띠 잇기", flap: "컵", handle: "어깨끈" },
  halter: { body: "그물 몸통", flap: "앞 V", handle: "목끈" },
  knotbag: { panel: "판", strap: "고리와 끈" },
  twoway: { handle: "손잡이와 조임끈" },
  coinbag: { handle: "손잡이와 고리" },
  ringbag: { handle: "링" },
  clutch: { handle: "체인 고리" },
  balaclava: { body: "목과 머리", panel: "얼굴 구멍", rim: "정수리", flap: "귀 장식", join: "귀 달기" },
  motifscarf: { panel: "모티프", join: "잇기" },
  bigsocks: { bottom: "발끝", body: "발과 목", rim: "접는 단", finish: "한 짝 더" },
  // 대바늘 기본형 (lib/knitwear)
  knitfold: { panel: "판", strap: "끈", rim: "입구 테두리" },
  knittop: { panel: "뒤판 · 앞판", body: "몸통", rim: "밑단", strap: "소매", finish: "소매 하나 더" },
};
/** a part's name for a piece (its own where it has one) */
export const partKo = (part: Part, item?: string | null): string => (item && WEAR_PARTS[item]?.[part]) || PART_KO[part];

export const rnd = (x: number) => Math.round(+x.toFixed(6));
export const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Everything the engine reads from a project / draft. */
export interface PlanInput {
  shape: Shape;
  a: number; // diameter (circle) or length (cm)
  b?: number; // width (cm), oval/rect
  h?: number; // body height (cm), bag
  hook: string;
  hookMm?: number | null; // hook size in mm (wins over the size name in `hook` when set)
  weight: string;
  object: ObjectKind;
  handle?: Handle;
  /** handle length in cm (wins over the old short 25 / long 90 of `handle`) */
  handleCm?: number | null;
  /** bag body widening to the top: the opening measured like `a` (diameter, or length for oval / rect);
   *  unset or <= a = straight body, as before */
  topA?: number | null;
  /** bag flap (cover) length in cm, worked back and forth over the back half of the opening; unset = none */
  flapCm?: number | null;
  /** "top": the flap first crosses the top's width (the bottom's width, b) before it falls (Draft.flapOver) */
  flapOver?: "top" | "fold" | null;
  /** "flat": no bottom width - round 1 round the foundation chain is the bottom, front and back joined (Draft.gusset) */
  gusset?: "flat" | "box" | null;
  /** "wrist": one loop at a corner; "grown": worked up out of the opening itself (Draft.handleKind, grownHandle) */
  handleKind?: "wrist" | "grown" | "rim" | null;
  /** a grown handle: its strap's width, the width it takes of the opening at its foot (cm), the stitch it is in */
  handleWcm?: number | null;
  handleBaseCm?: number | null;
  /** how the top is closed (Draft.closure): a drawstring adds an eyelet round under the rim */
  closure?: string | null;
  /** a shape the reader drew (web: 직접 그리기); when set, the rounds follow it (planFree) */
  free?: FreeShape | null;
  /** a picture painted freely (web: 직접 그리기 · 자유롭게, Kim) - worked flat in rows, the unpainted spots as holes */
  paint?: PaintShape | null;
  /** the crochet stitch the piece is worked in (Kim: 코바늘 무늬): 짧은뜨기 (sc, the default), 이랑뜨기 (sc in
   *  the back loop: ridges, the same height), 긴뜨기 (hdc), 한길긴뜨기 (dc) - taller stitches, fewer rows */
  crochetStitch?: CrochetStitch | null;
  /** a stitch pattern for a bag's body (Kim: 모양 - 무늬, written into the rounds with its own stitch multiple) */
  crochetChart?: ChartKey | null;
  /** a body drawn as a silhouette (Kim: round forms - a hobo swells and gathers, it is no box): the widths up its
   *  height, bottom first, as shares of the widest; the bottom (a) is the first width. The rows' counts follow it. */
  profile?: number[] | null;
  measuredH?: number | null; // stitch height from the 3rd-round measurement (cm)
  measuredW?: number | null; // stitch width from the 5-row measurement (rows / tube only, cm)
  /** the named stitch pattern picked (lib/stitchPatterns id), the needle and the knit chart in use: a pattern's
   *  repeat fits the stitch counts (repOf, Kim: 무늬 반복 단위에 코 수 맞추기). None of them: counts as before. */
  pattern?: string | null;
  craft?: "crochet" | "knit" | null;
  stitch?: string | null;
  item?: string;
  /** strands of the yarn held together (Kim: 메탈사는 여러 줄 합사, 1-3): a thicker yarn, a bigger gauge (PLY_K).
   *  Read only while 메탈사 is among `materials` (the choice is offered there; a number left behind by another
   *  yarn is not this yarn's). */
  plies?: number | null;
  materials?: string[] | null;
  /** 만드는 방법 (lib/structure, Kim: 구조 원리): "panels" two flat panels and a strip between them, "hobo1" a
   *  panel whose two ends go on up as posts that join into a strap. None: a bottom worked round, a wall on it. */
  build?: "panels" | "hobo1" | "ribbed" | null;
  /** ribbed: the hand's hole, its width and its height (cm; 0 = none) */
  holeW?: number | null;
  holeH?: number | null;
  /** a grown handle worked whole from one side and joined at the other (a slouch tote's strap), not two halves */
  handleFar?: boolean | null;
  /** a panel's lower corners, 0 square .. 1 as round as they can be */
  corner?: number | null;
  /** panels: the strip's width (cm), and whether it goes on as the handle (handleCm more) */
  stripCm?: number | null;
  stripHandle?: boolean | null;
  /** hobo: a post's stitches, the strap's length (cm), and the back worked from the other side of the chain */
  postSt?: number | null;
  strapCm?: number | null;
  hoboFold?: boolean | null;
  /** 사선 / 삼각형: a flat piece or a flap loses stitches at this edge (both: a triangle) down to `taperTip`
   *  stitches, which can go on as a cord `taperCordCm` long */
  taper?: "left" | "right" | "both" | null;
  taperTip?: number | null;
  taperCord?: boolean | null;
  taperCordCm?: number | null;
  /** 가장자리 짧은뜨기 한 바퀴 (lib/structure edgeRows) */
  edgeSc?: boolean | null;
  /** 바닥 시작 (Kim: 매직링에서 시작하는 둥근 직사각형 바닥): a square-cornered bottom started from a magic ring,
   *  its increases gathered at the four corners (and the long sides' extra spread along them); none: from a chain */
  bottomStart?: "chain" | "ring" | null;
  /** 꺾임선: the first round of the side worked in the back (or the front) loop only - the bottom and the side fold sharply */
  crease?: "back" | "front" | null;
  /** 볼록 테두리 (0 .. 1): at the side's end a round that widens, one as wide, one that narrows back - the edge rolls out */
  bulge?: number | null;
  /** a knitted top's sleeve, from the underarm (cm) */
  sleeveCm?: number | null;
  /** 두 색 손잡이 (Kim): the handles made first, in their own colour, and caught in at the opening's edge */
  handleFirst?: boolean | null;
  /** 브러싱 (0 off .. 1): the finished piece brushed - a last step in the words, hairier in the 3D, no count moved */
  brush?: number | null;
  /** 모자·소품 기본형 (lib/wear, Kim): the head's round and height (cm), a hat's brim (its width; worked double and
   *  folded in), a motif hat's motifs round the head and the rounds a brim motif is bigger by, a cord / strip /
   *  ear flap's length and width, the rows of post stitches along a hood's face edge */
  circ?: number | null;
  headH?: number | null;
  brimCm?: number | null;
  brimFold?: boolean | null;
  motifN?: number | null;
  brimMore?: number | null;
  tieCm?: number | null;
  tieWcm?: number | null;
  ribRows?: number | null;
  /** 그물의 구멍 크기: an arch of 3, 5 (when unset) or 7 chains (netArch) */
  netCh?: number | null;
  /** 보틀백: the bottle's own diameter and height (cm) - a and h are made from them (lib/wear bottleDims) */
  bottleD?: number | null;
  bottleH?: number | null;
  /** 작은 가방 · 옷 기본형 (Kim): the chest's round (cm); a phone's own width and height (a and h are made from them,
   *  lib/wear phoneDims); a stitch pattern worked as one edging round at a bag's opening; a flap that steps in -
   *  every `flapStepRows` rows, `flapStepSt` stitches at each end */
  bust?: number | null;
  phoneW?: number | null;
  phoneH?: number | null;
  rimChart?: ChartKey | null;
  /** 뷔스티에의 윗선 (Kim: 둘 다): two cups over the band (heart, the default) or the band alone, its top straight */
  topLine?: "heart" | "straight" | null;
  flapStepRows?: number | null;
  flapStepSt?: number | null;
  /** 10종 더 (lib/wear): a neck's round, a face opening's width and height, ears sewn on (바라클라바); a foot's
   *  length, an ankle's round, a cuff's height (오버사이즈 양말); a ring handle's diameter; two small loops for a chain at a
   *  bag's sides; a cord bag shown drawn in (the 3D only); how a line of motifs is coloured */
  neckCm?: number | null;
  faceW?: number | null;
  faceH?: number | null;
  ears?: boolean | null;
  footL?: number | null;
  ankleCm?: number | null;
  cuffCm?: number | null;
  ringCm?: number | null;
  chainLoops?: boolean | null;
  cinched?: boolean | null;
  motifColors?: "one" | "alt" | "ring" | null;
}

/** items that are knitted with needles (the rest is crochet) */
const KNIT_ITEMS = new Set(["scarf"]);
/** knitted pieces of their own make (lib/knitwear): knitted whatever they are worked as */
const KNIT_MADE = new Set(["knitfold", "knittop"]);
/** knitted: the needle picked (Draft.craft; knitting is worked out for flat pieces in rows), else the item's own */
export const isKnit = (p: { item?: string; craft?: string | null; object?: string }) => KNIT_MADE.has(p.item ?? "") ||
  p.craft === "knit" ? (p.object == null || p.object === "rows") : p.craft === "crochet" ? false : KNIT_ITEMS.has(p.item ?? "");

// ---- a pattern's repeat and the stitch counts (Kim: learned from how patterns are written, the principle only) ----
// A stitch pattern is a unit n stitches wide repeated across: the count of a row is n x k (+ the edge stitches
// when it is worked back and forth), never "whatever the size gives". So the size gives the count nearest to it
// that the repeat allows, and the piece says how far that moved the size (Plan.fit).
const KN_REP: Record<string, Rep> = {}, CH_REP: Record<string, Rep> = {};
for (const sp of STITCH_PATTERNS) { const [k, v] = (sp.draw ?? ":").split(":"); if (sp.rep && k === "kn" && !KN_REP[v]) KN_REP[v] = sp.rep; if (sp.rep && k === "ch" && !CH_REP[v]) CH_REP[v] = sp.rep; }
/** the repeat of the pattern a piece is worked in, or null (plain stitches, or a pattern with no fixed multiple).
 *  The picked pattern counts only while it is the one in use (a stitch changed elsewhere leaves `pattern` behind). */
export function repOf(p: Pick<PlanInput, "pattern" | "craft" | "stitch" | "item" | "object" | "crochetChart" | "crochetStitch">): Rep | null {
  const sp = p.pattern ? PATTERN_BY_ID[p.pattern] : undefined, [k, v] = (sp?.draw ?? ":").split(":");
  if (isKnit(p)) {
    if (sp?.needle === "knit" && k === "cc" && !p.stitch) return sp.rep ?? null;
    return KN_REP[p.stitch ?? "stock"] ?? null;
  }
  if (p.crochetChart === "net" && (p as { netCh?: number | null }).netCh && netArch(p as { netCh?: number | null }) !== 5) return { n: NET[netArch(p as { netCh?: number | null })].m, plus: 1, rows: 1 };
  if (p.crochetChart) return CH_REP[p.crochetChart] ?? { n: CHART_MULT[p.crochetChart][0], plus: CHART_MULT[p.crochetChart][1], rows: 1 };
  if (sp?.needle === "crochet" && k === "cc" && !(p.crochetStitch && p.crochetStitch !== "sc")) return sp.rep ?? null;
  return null;
}
/** the count nearest `want` that a repeat allows: n x k, + its edge stitches when worked back and forth (`flat`);
 *  never under `lo` nor over `hi` (a half-way count goes up, as the charts' own rounding does) */
export function fitCount(want: number, rep: Rep | null, flat: boolean, lo = 1, hi = Infinity): number {
  if (!rep || rep.n <= 1) return want;
  const a = flat ? rep.plus : 0;
  let v = Math.max(1, Math.round((want - a) / rep.n)) * rep.n + a;
  while (v < lo) v += rep.n;
  while (v > hi && v - rep.n >= lo) v -= rep.n;
  return v;
}
/** How a pattern's repeat moved a piece's count: from the size's own count to the fitted one, and what that
 *  does to the size (cm; `of`: the width of a piece laid flat, or a tube's circumference). */
export interface Fit { n: number; plus: number; from: number; to: number; cm: number; of: "width" | "round"; flat: boolean }
/** the small note under the size (Kim's words): null when the size's own count already fits */
export function fitNote(f?: Fit | null): string | null {
  if (!f || f.from === f.to) return null;
  return `무늬가 맞도록 ${f.flat ? "한 단" : "한 바퀴"}을 ${f.to}코로 맞췄습니다. ${f.of === "round" ? "둘레가" : "너비가"} 약 ${fmt(Math.abs(f.cm))}cm 달라집니다.`.replace("한 바퀴을", "한 바퀴를");
}
/** held strands and the gauge (Kim: 합사 줄 수에 따라 게이지가 굵어지게). Strands held together are a yarn
 *  sqrt(strands) as thick; our own yarn levels move the gauge 0.9 -> 1.15 as the yarn goes from about 2 to 5mm,
 *  that is by thickness ^ 0.27 - so two strands give x 1.10 and three x 1.16, the same rule carried on. */
export const PLY_K: Record<number, number> = { 1: 1, 2: 1.1, 3: 1.16 };
/** 메탈사 (it was listed as 메탈릭 before; a work saved then is the same yarn) */
export const isMetalYarn = (m?: string[] | null) => !!m?.some(x => x === "메탈사" || x === "메탈릭");
/** the strands a piece's yarn is held in: the picked number for 메탈사, one for every other yarn */
export const pliesOf = (p: { plies?: number | null; materials?: string[] | null }) => (isMetalYarn(p.materials) && p.plies && p.plies > 1 ? Math.min(3, Math.round(p.plies)) : 1);
export const plyK = (n?: number | null) => PLY_K[Math.round(n ?? 1)] ?? 1;
/** the thickness of `n` strands held together (mm, one decimal) */
export const pliedMm = (mm: number, n?: number | null) => Math.round(mm * Math.sqrt(Math.min(3, Math.max(1, Math.round(n ?? 1)))) * 10) / 10;

/** A drawn shape: its side profile from the bottom up, smoothed - [radius, height], both as shares of the
 *  piece's height - the height in cm, and the colours by height ([from this share of the height, colour]). */
/** a silhouette's width at a share of its height (0 bottom .. 1 top), between its samples */
export const profAt = (pr: number[], t: number) => { const x = Math.min(1, Math.max(0, t)) * (pr.length - 1), i = Math.min(pr.length - 2, Math.floor(x)), f = x - i; return pr[i] + (pr[i + 1] - pr[i]) * f; };
export type CrochetStitch = "sc" | "blo" | "hdc" | "dc";
/** each crochet stitch: its name, how much taller than single crochet, its turning chain */
export const CROCHET: Record<CrochetStitch, { ko: string; h: number; turn: number; note: string }> = {
  sc: { ko: "짧은뜨기", h: 1, turn: 1, note: "촘촘하고 단단합니다" },
  blo: { ko: "이랑뜨기", h: 1, turn: 1, note: "뒷고리만 떠서 가로 줄이 생깁니다" },
  hdc: { ko: "긴뜨기", h: 1.6, turn: 2, note: "조금 더 부드럽고 빨리 올라갑니다" },
  dc: { ko: "한길긴뜨기", h: 2.2, turn: 3, note: "성글고 가볍게 높이 올라갑니다" },
};
export interface FreeShape { pts: [number, number][]; hCm: number; bands?: [number, string][] }
/** A painted picture (Kim: "like a paint program"): a gw x gh grid, row-major from the top row; each cell "."
 *  (nothing - the paper, a hole in the piece) or a palette index in base 36. The piece is wCm wide and hCm
 *  tall, worked flat in rows from the bottom; `pieces` 2 = the same shape twice (a bag's front and back). */
export interface PaintShape { gw: number; gh: number; cells: string; palette: string[]; wCm: number; hCm: number; pieces?: 1 | 2 }

/** The painted picture sampled at a piece's own stitches and rows: W x H, row-major from the bottom row;
 *  -1 = a hole, else the palette index. (The 3D and the pattern sample it the same way.) */
export function paintMask(f: PaintShape, W: number, H: number): number[] {
  const out: number[] = new Array(W * H);
  for (let r = 0; r < H; r++) {
    const gy = f.gh - 1 - Math.min(f.gh - 1, Math.floor((r + .5) / H * f.gh));
    for (let i = 0; i < W; i++) {
      const gx = Math.min(f.gw - 1, Math.floor((i + .5) / W * f.gw)), ch = f.cells[gy * f.gw + gx];
      out[r * W + i] = !ch || ch === "." ? -1 : parseInt(ch, 36);
    }
  }
  return out;
}
/** stitches across and rows up for a painted piece (the gauge of its yarn and hook) */
export const paintSize = (f: PaintShape, g: Gauge) => ({ W: clamp(rnd(f.wCm / g.w), 2, 600), H: clamp(rnd(f.hCm / g.h), 2, 800) });

export interface Gauge { h: number; w: number; measured: boolean }

export interface Row {
  part: Part;
  n: number;
  how: string;
  why: string;
  inc: number;
  idx: number;
  no?: number;
  label: string;
  /** a drawn shape's round in its own colour (unset: the pattern's yarn colour) */
  color?: string;
  /** how tall the round is against a single-crochet round (a stitch pattern's 한길긴뜨기 rounds ~2): the 3D
   *  draws it as that many rounds */
  hk?: number;
  /** the round says its own start and end (a stitch pattern's round: its chain and its closing stitch are part
   *  of the pattern) - withChains leaves it as written */
  own?: boolean;
  /** a stitch pattern's round: which pattern, which of its rounds (0 the first), how many repeats - the symbol
   *  chart and the Korean notation write it from these, not from the words */
  wall?: { k: ChartKey; i: number; reps: number; /** a net's arch when it is not 5 chains */ ch?: number };
  /** a round of a square motif (lib/wear): whose, and which round */
  motif?: { name: string; r: number };
  /** a row of post stitches along an edge (이어플랩 후드): its base row of 한길긴뜨기, front-post first, back-post first */
  rib?: "base" | "fb" | "bf";
  /** a head scarf's row in 그물 or 레이스: the pattern, the row (0 the first), its arches or V's */
  lace?: { k: "net" | "vst"; i: number; reps: number };
  /** a round of a circle worked as a piece of its own (반달 미니백): whose, which round, and the stitches a slot is left over */
  disc?: { name: string; r: number; hole?: number };
  /** a flap's row that steps in: the stitches left at each end (the first slipped over, the last left unworked) */
  step?: number;
  /** a row of a net that comes to a point (홀터 탑): its arches */
  vnet?: number;
  /** a row of eyelets in a flat panel (a chain over every other stitch): how many */
  eyelet?: number;
  /** a round that crosses an opening left below it with chains (a balaclava's face): how many */
  bridge?: number;
  /** a row of a handle grown out of the opening (grownHandle): picked up, narrowing, straight, or the edging
   *  round an opening is finished with; which of the two feet; its stitch */
  grown?: { k: "pick" | "dec" | "even" | "edge"; side: 0 | 1; st: CrochetStitch; /** worked in the body's stitch pattern: a repeat's stitches */ unit?: number };
  /** a row of a flat piece that changes width (lib/structure): the stitches gained (+) or lost (-) at the piece's
   *  left and right edge - the symbol chart and the 3D set the row there; `work`: lost at the row's start and end
   *  as it is worked (rows turn); `post`: which of a hobo panel's two posts */
  edge?: [number, number];
  work?: [number, number];
  /** a hole in the row (a ribbed panel's hand hole): from which stitch, how many, and 1 when chains cross it */
  gap?: [number, number, number];
  post?: 0 | 1;
  /** a round of 짧은뜨기 round a free edge (가장자리, lib/structure edgeRows): "loop" all the way round and closed,
   *  "edge" along an edge from one end to the other (a flap's) */
  border?: "loop" | "edge";
  /** the round the side's crease is worked on (꺾임선), and the rounds of a rolled edge (볼록 테두리) */
  crease?: "back" | "front";
  bulge?: true;
  /** written for three sizes at once (lib/sizes multiSized): the three counts, S M L */
  nSizes?: [number, number, number];
}

/** the stitches round a bag's opening: its last round, before any flap or handle */
export const openingN = (pp: { rows: Row[] }): number => [...pp.rows].reverse().find(r => r.part === "rim" || r.part === "body")?.n ?? 0;

/** A handle grown out of the body (Kim: 몸통에서 이어 뜨는 손잡이 - the way a hobo bag is made, nothing sewn on).
 *  The opening's round is shared out: a foot at each end of the bag, a gap between them at the front and at the
 *  back. Each foot is worked back and forth, narrower at each edge every row until it is the strap's width, then
 *  straight up; the two ends meet over the middle and are sewn. Each opening left (a gap and the edges of the
 *  two halves) is then worked round in 짧은뜨기 so the edge does not stretch.
 *  It is the body going on (Kim: 손잡이는 몸통과 같은 무늬로, 그게 무슨 무늬든): in the body's own stitch, a stitch
 *  off each edge a row; in the body's stitch pattern, a whole repeat off each edge a row (the first repeat
 *  crossed in slip stitches, the last left unworked), so every row is whole repeats.
 *  Every number is the gauge's: foot and strap = their widths / a stitch's (a repeat's) width, rows = half the
 *  handle's length / the body's row height, edging = the edge's length / a stitch's width. `rimN`: the
 *  opening's stitches. */
export function grownHandle(p: Pick<PlanInput, "handleWcm" | "handleBaseCm" | "handleCm" | "crochetStitch" | "crochetChart" | "pattern">, g: { w: number; h: number }, rimN: number) {
  const wk = wallKeyOf(p as PlanInput), st: CrochetStitch = !wk && p.crochetStitch && CROCHET[p.crochetStitch] ? p.crochetStitch : "sc";
  const u = wk ? CHART_MULT[wk][0] : 1, rh = g.h * (wk ? WALL_HT[wk] : CROCHET[st].h), uw = g.w * u; // a unit: a stitch, or a repeat
  const most = Math.max(1, Math.floor(Math.floor(rimN / u) / 2) - 1); // a unit at least is left between the two feet
  let strapU = Math.min(Math.max(wk ? 1 : 2, rnd((p.handleWcm ?? 2.5) / uw)), most);
  let baseU = clamp(p.handleBaseCm && p.handleBaseCm > 0 ? rnd(p.handleBaseCm / uw) : Math.round(rimN / u * .4), strapU, most);
  // a unit off each edge a row: the foot and the strap are both even or both odd
  if ((baseU - strapU) % 2) { if (baseU < most) baseU++; else if (baseU > strapU) baseU--; else strapU--; }
  const base = baseU * u, strap = strapU * u, dec = (baseU - strapU) / 2, len = p.handleCm && p.handleCm > 0 ? p.handleCm : 40;
  const rows = Math.max(dec + 2, rnd(len / 2 / rh)), gapA = Math.floor((rimN - 2 * base) / 2), gapB = rimN - 2 * base - gapA;
  const ends = Math.max(2, rnd(2 * rows * rh / g.w)); // the row ends along one opening, as 짧은뜨기
  return { wk, st, u, rh, strap, base, dec, rows, even: rows - 1 - dec, gapA, gapB, ends, lenCm: Math.round(2 * rows * rh * 10) / 10, baseCm: Math.round(base * g.w * 10) / 10, maxBaseCm: Math.floor(most * uw * 2) / 2 };
}

export interface Plan {
  /** the turning chain of the plan's stitch (1 = single crochet, when missing) */
  turn?: number;
  g: Gauge;
  c: number;
  rows: Row[];
  bottomRounds: number;
  bodyRows: number;
  last: number;
  /** a stitch pattern's repeat moved the count (repOf / fitCount): unset when it fits as the size gives it */
  fit?: Fit;
  /** the piece is made this many times (a pair of boots): the rows are one's, the yarn all of them */
  pairs?: number;
}

type RawRow = Omit<Row, "idx" | "label">;

export function gauge(p: PlanInput): Gauge {
  if (p.measuredH) return { h: p.measuredH, w: p.measuredH * 0.95, measured: true };
  const h = (p.hookMm || HOOK_MM[p.hook] || 3) * 0.2 * (YARN[p.weight as Weight] || 1) * (p.crochetStitch ? CROCHET[p.crochetStitch].h : 1) * plyK(pliesOf(p));
  return { h, w: h * 0.95, measured: false };
}

/** `rep`: a body's stitch pattern (a bag's) - the bottom's last round takes more or fewer increases so that it
 *  ends on the pattern's multiple (Kim: 바닥 공식의 마지막 단에서 늘림을 조절, the body itself never increases);
 *  never fewer stitches than the round before. `from`: the last round's count as the size alone gives it. */
export function planBottom(p: PlanInput, g: Gauge, rep?: Rep | null): { rows: RawRow[]; c: number; from?: number } {
  const rows: RawRow[] = [], m = rep && rep.n > 1 ? rep.n : 0;
  const fitWhy = (n: number) => ` · 무늬가 ${m}코 단위라 ${n}코(${m} × ${n / m})로 맞춥니다`;
  if (p.shape === "circle") {
    const R = Math.max(3, rnd((p.a / 2) / g.h));
    for (let r = 1; r <= R; r++) {
      const prev = 6 * (r - 1), n = m && r === R ? fitCount(6 * r, rep!, false, prev, prev * 2) : 6 * r;
      if (n !== 6 * r) {
        const inc = n - prev;
        rows.push({ part: "bottom", n, inc, how: inc ? `짧은뜨기 ${n}코 (늘림 ${inc}코를 고르게 나눠서)` : `늘림 없이 짧은뜨기 ${n}코`, why: (inc ? `${prev} + 늘림 ${inc} = ${n}` : `${n}코 그대로`) + fitWhy(n) });
        return { rows, c: 0, from: 6 * r };
      }
      let how: string;
      if (r === 1) how = "매직링에 짧은뜨기 6코";
      else if (r === 2) how = "모든 코에 늘림";
      else if (r % 2 === 0 || r < 4) how = `(짧은뜨기 ${r - 2}, 늘림 1) × 6`;
      else { const k = Math.floor((r - 2) / 2); how = `짧은뜨기 ${k}, (늘림 1, 짧은뜨기 ${r - 2}) × 5, 늘림 1, 짧은뜨기 ${r - 2 - k}`; }
      rows.push({ part: "bottom", n, how, why: r === 1 ? "시작" : `${prev} + 늘림 6 = ${n}${r >= 4 && r % 2 ? " · 늘림 자리를 반 칸 밀어 둥글게" : ""}`, inc: r === 1 ? 0 : 6 });
    }
    return { rows, c: 0 };
  }
  const b = p.b as number, flat = p.gusset === "flat";
  if (p.shape === "rect" && !flat && p.bottomStart === "ring") return ringRect(p, g, rep);
  // flat (면과 면 잇기, Kim): the chain as long as the piece, worked round both its sides once - that round is the
  // whole bottom, and the body goes straight up from it, front and back meeting at the bottom edge
  const straight = Math.max(g.w * 2, flat ? p.a - g.w * 2 : p.a - b);
  const c0 = Math.max(3, rnd(straight / g.w) + 1);
  const R = flat ? 1 : Math.max(3, rnd((b / 2) / g.h));
  const per = p.shape === "oval" ? 6 : 8;
  // one round only (flat): no increase to change, so the chain itself is made longer or shorter - the round is
  // 2 (c - 1) + 6, an even count, so the multiple is taken in twos
  const flatFit = m && flat ? fitCount(2 * (c0 - 1) + 6, { n: m % 2 ? m * 2 : m, plus: 0, rows: 1 }, false, 10) : 0;
  const c = flatFit ? (flatFit - 6) / 2 + 1 : c0;
  for (let r = 1; r <= R; r++) {
    const n0 = 2 * (c - 1) + 6 + per * (r - 1), pv = n0 - per;
    if (m && !flat && r === R && fitCount(n0, rep!, false, pv, pv * 2) !== n0) {
      const n = fitCount(n0, rep!, false, pv, pv * 2), inc = n - pv, ends = p.shape === "oval" ? "양 끝 반원" : "양 끝 모서리 둘레";
      rows.push({ part: "bottom", n, inc, how: inc ? `직선은 그대로, ${ends}에서 늘림 ${inc}코를 고르게 나눠서` : `늘림 없이 짧은뜨기 ${n}코`, why: (inc ? `${pv} + 늘림 ${inc} = ${n}` : `${n}코 그대로`) + fitWhy(n) });
      return { rows, c, from: n0 };
    }
    const n = n0;
    const prev = r === 1 ? 0 : n - per;
    let how: string;
    if (r === 1) how = `사슬 ${c}코, 둘째 코부터 짧은뜨기 ${c - 2}코 · 끝 코에 3코 · 반대편 짧은뜨기 ${c - 2}코 · 끝 코에 3코`;
    else if (p.shape === "oval") how = "직선은 그대로, 양 끝 반원에서 3번씩 늘림";
    else how = "직선은 그대로, 네 모서리 코마다 3코 뜨기";
    rows.push({ part: "bottom", n, how, why: r === 1 ? `사슬 ${c}코 기초 → ${n}코${flat ? " · 바닥 너비 없이 앞뒤가 바로 맞붙습니다" : ""}${c !== c0 ? fitWhy(n) : ""}` : `${prev} + 늘림 ${per} = ${n}`, inc: r === 1 ? 0 : per });
  }
  return { rows, c, ...(c !== c0 ? { from: 2 * (c0 - 1) + 6 } : {}) };
}

/** A drawn shape as rounds (web: 직접 그리기 - Kim: the reader's outline, tidied, made into a crochet formula).
 *  The profile is walked from the bottom one round's height at a time; each round has the stitches its
 *  circumference needs (never more than double, never less than half the round before, so every round can
 *  be worked). A profile that starts on the centre line starts with a magic ring; rounds lying on the ground
 *  are the bottom, the rest the body. A round takes the colour drawn at its height. */
export function planFree(p: PlanInput): Plan {
  const g = gauge(p), f = p.free as FreeShape, H = Math.max(1, f.hCm);
  const pts = (f.pts.length >= 2 ? f.pts : [[0, 0], [0.3, 0], [0.3, 1]] as [number, number][]).map(([r, y]) => [Math.max(0, r) * H, y * H]);
  const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = acc[acc.length - 1], R = clamp(rnd(L / g.h), 3, 400);
  const at = (s: number) => { let i = 1; while (i < acc.length - 1 && acc[i] < s) i++; const t = (s - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; };
  const closed = pts[0][0] < g.w * 1.2, bands = (f.bands ?? []).slice().sort((a, b) => a[0] - b[0]);
  const colorAt = (y: number) => { let c: string | undefined; for (const [from, hex] of bands) if (y / H >= from - 1e-6) c = hex; return c || undefined; };
  const rows: Row[] = []; let prev = 0, lastColor: string | undefined, bottomRounds = 0;
  for (let k = 1; k <= R; k++) {
    const [r, y] = at(L * k / R), [, ym] = at(L * (k - .5) / R);
    let n = Math.max(4, Math.round(2 * Math.PI * r / g.w));
    if (k === 1) n = closed ? 6 : Math.max(8, n); else n = clamp(n, Math.ceil(prev / 2), prev * 2);
    const inc = k === 1 ? 0 : n - prev, d = -inc;
    const how = k === 1 ? (closed ? "매직링에 짧은뜨기 6코" : `사슬 ${n}코로 고리를 만들고 짧은뜨기 ${n}코`)
      : inc > 0 ? (inc === prev ? "모든 코에 늘림" : prev % inc === 0 ? `(짧은뜨기 ${prev / inc - 1}, 늘림 1) × ${inc}` : `짧은뜨기 ${n}코 (늘림 ${inc}코를 고르게 나눠서)`)
      : inc < 0 ? (prev % d === 0 && prev / d >= 2 ? (prev / d === 2 ? `줄임 ${d}번` : `(짧은뜨기 ${prev / d - 2}, 줄임 1) × ${d}`) : `짧은뜨기 ${n}코 (줄임 ${d}번을 고르게 나눠서)`)
      : `늘림 없이 짧은뜨기 ${n}코`;
    const color = colorAt(ym), swap = k > 1 && color !== lastColor;
    const part: Part = y < g.h * .6 && bottomRounds === k - 1 ? "bottom" : "body"; if (part === "bottom") bottomRounds = k;
    const why = (k === 1 ? "시작" : inc > 0 ? `${prev} + 늘림 ${inc} = ${n}` : inc < 0 ? `${prev} - 줄임 ${d} = ${n}` : `${n}코 그대로`) + (swap ? " · 여기서 실 색을 바꿉니다" : "") + (k === R && r < g.w * 1.5 ? " · 남은 코를 돌려 조여 마무리" : "");
    rows.push({ part, n, how, why, inc, idx: k - 1, label: `${k}단`, ...(part === "bottom" ? { no: k } : {}), ...(color ? { color } : {}) });
    prev = n; lastColor = color;
  }
  return { g, c: 0, rows, bottomRounds, bodyRows: rows.length - bottomRounds, last: rows[rows.length - 1].n };
}

/** A painted picture as rows (Kim: draw it freely, holes and all). Worked flat from the bottom: each row in
 *  single crochet over its painted stitches, a chain over each hole (the next row works into the chain), a
 *  colour change where the picture changes colour. Rows with nothing painted are left out. */
/** what a painted picture's row says where its colour changes (Kim: 두 색 그림 넣기 - tapestry crochet) */
export const COLOR_SWAP = "색이 바뀌는 코 앞: 앞 코의 마지막 고리를 빼기 직전에 다음 색으로 바꿉니다. 쓰지 않는 색은 안에 감싸서 함께 가져갑니다.";
export function planPaint(p: PlanInput): Plan {
  const g = gauge(p), f = p.paint as PaintShape, { W, H } = paintSize(f, g), m = paintMask(f, W, H), multi = f.palette.length > 1;
  const rows: Row[] = []; let span = 0, first = true, last = 0;
  for (let rr = 0; rr < H; rr++) {
    const row = m.slice(rr * W, rr * W + W), a = row.findIndex(c => c >= 0); if (a < 0) continue;
    let b = W - 1; while (row[b] < 0) b--;
    const parts: string[] = []; let n = 0, cnt: Record<number, number> = {};
    for (let i = a; i <= b;) {
      let j = i; while (j + 1 <= b && row[j + 1] === row[i]) j++;
      const len = j - i + 1;
      if (row[i] < 0) parts.push(`사슬 ${len}코 (구멍)`);
      else { parts.push(`${multi ? `색 ${row[i] + 1}로 ` : ""}짧은뜨기 ${len}`); n += len; cnt[row[i]] = (cnt[row[i]] ?? 0) + len; }
      i = j + 1;
    }
    const top = Number(Object.entries(cnt).sort((x, y) => y[1] - x[1])[0][0]);
    if (first) { span = b - a + 1; rows.push({ part: "start", n: span + 1, how: `사슬 ${span + 1}코`, why: `첫 단의 폭 ${span}코, 기둥 사슬 1코 더` + (f.pieces === 2 ? " · 같은 모양으로 2장을 떠서 옆과 아래를 잇습니다" : ""), inc: 0 } as Row); }
    const lead = first ? "" : `${a + 1}번째 코부터: `;
    // 두 색 그림 넣기 (Kim): a row that changes colour says how, before the stitch where it does
    const swaps = multi ? row.slice(a, b + 1).filter(c => c >= 0).reduce((k, c, i, arr) => k + (i && arr[i - 1] !== c ? 1 : 0), 0) : 0;
    rows.push({ part: "rows", n, how: (first ? "두 번째 사슬부터 " : `사슬 1, 뒤집어서 ${lead}`) + parts.join(", "), why: `이 단 ${n}코` + (swaps ? ` · 색 바꿈 ${swaps}번 · ${COLOR_SWAP}` : ""), inc: 0, ...(f.palette[top] ? { color: f.palette[top] } : {}) } as Row);
    first = false; last = n;
  }
  if (!rows.length) rows.push({ part: "start", n: 2, how: "사슬 2코", why: "그린 곳이 없습니다", inc: 0 } as Row);
  labelFlat(rows);
  return { g, c: span + 1, rows, bottomRounds: 0, bodyRows: rows.filter(x => x.part === "rows").length, last };
}

/** 매직링에서 시작하는 둥근 직사각형 바닥 (Kim): the same bottom as the chain's - as many rounds (half its width
 *  over a round's height), the same last round (its perimeter) - begun from a magic ring of 8. A round's increases:
 *  8 at the four corners (a corner stitch worked 3 times), and what the long sides still need spread along the
 *  two of them - as many as are left over the rounds left, never more than the round before has stitches. The
 *  corners are marked on round 1. A stitch pattern on the body: the last round is fitted to its repeat. */
function ringRect(p: PlanInput, g: Gauge, rep?: Rep | null): { rows: RawRow[]; c: number; from?: number } {
  const b = p.b as number, straight = Math.max(g.w * 2, p.a - b), c = Math.max(3, rnd(straight / g.w) + 1), R = Math.max(3, rnd((b / 2) / g.h));
  const n0 = 2 * (c - 1) + 6 + 8 * (R - 1), m = rep && rep.n > 1 ? rep.n : 0, target = m ? fitCount(n0, rep!, false, n0 - 8, n0 * 2) : n0;
  const rows: RawRow[] = [{ part: "bottom", n: 8, inc: 0, how: "매직링에 짧은뜨기 8코 · 1, 3, 5, 7번째 코에 마커", why: "네 모서리가 될 코에 마커를 겁니다 · 늘림 자리를 확인하려는 것입니다" }];
  let T = 8, r = 1;
  while (T < target) {
    r++; const left = Math.max(1, R - r + 1), need = target - T;
    const inc = need <= 8 ? need : clamp(Math.ceil(need / left), 8, T), corner = Math.min(8, inc) - (Math.min(8, inc) % 2), extra = inc - corner;
    const how = (corner === 8 ? "네 모서리 코마다 3코 뜨기" : `네 모서리 중 ${corner / 2}곳에서 3코 뜨기`) + (extra ? `, 긴 두 변에서 늘림 ${extra}코를 고르게 나눠서` : "");
    rows.push({ part: "bottom", n: T + inc, inc, how, why: `${T} + 늘림 ${inc} = ${T + inc}${extra ? ` · 모서리 8코 + 긴 변 ${extra}코` : ""}${r === R && T + inc === target && m ? ` · 무늬가 ${m}코 단위라 ${target}코로 맞춥니다` : ""}` });
    T += inc;
  }
  return { rows, c: 2, ...(target !== n0 ? { from: n0 } : {}) };
}

/** 꺾임선 · 볼록 테두리 (Kim): the side's first round in one loop only, the rolled edge at its end - put on the
 *  rows the plan made, so none of its counts move (only the rolled edge's own rounds come in, and return to the
 *  side's count) */
function formed(pp: Plan, p: PlanInput): Plan {
  if (p.object !== "bag" || p.free || p.paint || p.build || (!p.crease && !(p.bulge && p.bulge > 0))) return pp;
  let rows = pp.rows.map(r => ({ ...r }));
  const first = rows.findIndex(r => r.part === "body");
  if (p.crease && first >= 0) {
    const r = rows[first], loop = p.crease === "back" ? "뒤이랑(뒷고리에만)" : "앞이랑(앞고리에만)";
    rows[first] = { ...r, crease: p.crease, how: `${loop}으로 ${r.how}`, why: `${r.why} · 꺾임선: 바닥과 옆 사이가 또렷하게 꺾입니다` };
  }
  if (p.bulge && p.bulge > 0) {
    let last = -1; rows.forEach((r, i) => { if (r.part === "body") last = i; });
    if (last >= 0) {
      const N = rows[last].n, k = Math.max(2, 2 * Math.round(N * .12 * Math.min(1, p.bulge)));
      const roll: Row[] = [
        { part: "body", n: N + k, inc: k, bulge: true, how: `짧은뜨기 ${N + k}코 (늘림 ${k}코를 고르게 나눠서)`, why: `볼록 테두리 · ${N} + 늘림 ${k} = ${N + k} · 바깥으로 벌어지기 시작합니다` } as Row,
        { part: "body", n: N + k, inc: 0, bulge: true, how: `늘림 없이 짧은뜨기 ${N + k}코`, why: "볼록 테두리 · 가장 넓은 단입니다" } as Row,
        { part: "body", n: N, inc: -k, bulge: true, how: `짧은뜨기 ${N}코 (줄임 ${k}번을 고르게 나눠서)`, why: `볼록 테두리 · ${N + k} - 줄임 ${k} = ${N} · 테두리가 바깥으로 말립니다` } as Row,
      ];
      rows = [...rows.slice(0, last + 1), ...roll, ...rows.slice(last + 1)];
    }
  }
  const nb = rows.filter(r => r.part === "bottom").length; let bo = 0;
  rows.forEach((r, i) => { r.idx = i; if (r.part === "body") r.label = `${nb + (++bo)}단`; });
  return { ...pp, rows, bodyRows: bo };
}
/** 두 색 손잡이 (Kim: 손잡이를 다른 색으로 먼저 뜨고 입구 테두리에서 함께 걸어 고정): the handles made apart go
 *  first - in their own colour, before the bottom - and the opening's first edging round catches their ends */
function handlesFirst(pp: Plan, p: PlanInput): Plan {
  if (!p.handleFirst || p.object !== "bag") return pp;
  const apart = (r?: Row) => !!r && r.part === "handle" && !r.own && !r.grown && !r.border;
  const first: Row[] = [], rest: Row[] = [];
  pp.rows.forEach((r, i) => { (apart(r) || (r.border && r.part === "handle" && apart(pp.rows[i - 1])) ? first : rest).push(r); });
  if (!first.length) return pp;
  const hs = first.map(r => r.border ? r : { ...r, how: r.how.replace(/(가장자리를 두른 뒤 )?(?:\S+에 (?:함께 )?연결)$/, "$1끝은 입구 테두리에서 함께 걸어 고정합니다"),
    why: `${r.why} · 손잡이 색 실로 바닥보다 먼저 떠 둡니다` });
  const ri = rest.findIndex(r => r.part === "rim" && !r.border && !r.how.startsWith("빼뜨기"));
  if (ri >= 0) rest[ri] = { ...rest[ri], how: `${rest[ri].how} · 먼저 떠 둔 손잡이의 두 끝을 앞뒤 자리에 대고 함께 걸어 뜹니다`, why: `${rest[ri].why} · 손잡이가 입구에 단단히 고정됩니다` };
  const rows = [...hs, ...rest]; rows.forEach((r, i) => { r.idx = i; });
  return { ...pp, rows };
}
/** 모양 잡히는 실 (Kim: 와이어 코어): the shape is set by hand at the end, and its slip stitches are worked loosely */
export const WIRE = "와이어 코어";
function wired(pp: Plan, p: PlanInput): Plan {
  if (!(p.materials ?? []).includes(WIRE)) return pp;
  const row = { part: "finish", n: 0, inc: 0, own: true, idx: pp.rows.length, label: "모양 잡기", how: "다 뜬 뒤 손으로 모양을 잡아 줍니다",
    why: "와이어 코어는 구부린 모양을 그대로 지킵니다 · 빼뜨기는 느슨하게 떠야 다음 코에 바늘이 잘 들어갑니다" } as Row;
  return { ...pp, rows: [...pp.rows, row] };
}

/** The plan in the picked crochet stitch: worked out in single crochet (taller rows from gauge), then each row
 *  says its own stitch, and its turning chain is the stitch's own (withChains reads Plan.turn). */
export function plan(p: PlanInput): Plan {
  // (a ribbed panel is always worked in the back loop: that is what makes its ribs)
  // (the edging is 짧은뜨기 whatever the piece is worked in: it goes on after the stitch is named; the last steps after it)
  const done = (q: Plan) => brushed(wired(snapped(handlesFirst(edged(q, p), p), p), p), p);
  const pp = formed(planSc(p), p), st = p.build === "ribbed" && p.object === "bag" ? "blo" : p.crochetStitch;
  if (!st || st === "sc") return done(pp);
  const c = CROCHET[st], name = st === "blo" ? "짧은뜨기 이랑뜨기(뒷고리)" : c.ko;
  // (되돌아짧은뜨기 - crab stitch, the joining - is its own stitch whatever the piece is worked in)
  const rows = pp.rows.map(r => ({ ...r, how: r.how.replace(/(?<!되돌아)짧은뜨기/g, name) }));
  return done({ ...pp, rows, turn: c.turn });
}
/** 가장자리 짧은뜨기 (Kim): the edging rounds put in where they are worked, every row numbered again */
function edged(pp: Plan, p: PlanInput): Plan {
  if (!p.edgeSc || p.object !== "bag" || p.free || p.paint) return pp;
  const rows = edgeRows(pp, p); if (rows === pp.rows) return pp;
  rows.forEach((r, i) => { r.idx = i; });
  return { ...pp, rows };
}
/** 자석 단추 (Kim: 입구 안쪽 자석 단추): sewn on inside the opening after the last stitch - a step, no stitch of its own */
function snapped(pp: Plan, p: PlanInput): Plan {
  if (p.closure !== "magnet" || p.object !== "bag") return pp;
  const row = { part: "finish", n: 0, inc: 0, own: true, idx: pp.rows.length, label: "자석 단추", how: "입구 안쪽 가운데에 자석 단추 한 쌍을 앞뒤로 마주 보게 답니다",
    why: "입구 마지막 단 바로 아래 안쪽에 같은 실로 꿰매어 답니다. 코 수는 바뀌지 않습니다" } as Row;
  return { ...pp, rows: [...pp.rows, row] };
}
/** 브러싱 (Kim): the finished piece is brushed - one more step after the last stitch, no stitch of its own */
function brushed(pp: Plan, p: PlanInput): Plan {
  if (!(p.brush && p.brush > 0)) return pp;
  const row = { part: "finish", n: 0, inc: 0, own: true, idx: pp.rows.length, label: "마무리", how: "다 뜬 뒤 브러시로 표면을 빗어 털 질감을 냅니다",
    why: `브러싱 ${Math.round(Math.min(1, p.brush) * 100)}% · 결을 따라 가볍게 여러 번 빗습니다. 코 수는 바뀌지 않습니다` } as Row;
  return { ...pp, rows: [...pp.rows, row] };
}

/** a crochet stitch pattern worked in the round up a bag's body (lib/crochetChart CHART_ROWS, in rounds: each
 *  round closed with a slip stitch and the next begun where the pattern needs it). The stitches are evened to the
 *  pattern's multiple first, so every repeat closes; the count stays the same up the body (straight). */
const WALL_HT: Record<ChartKey, number> = { shell: 2.05, mesh: 2.05, vst: 2.05, moss: 1, net: 1.45 };
/** 그물의 구멍 크기 (Kim: 보틀백 - 구멍 크기 설정): an arch of 3, 5 or 7 chains stands over 3, 4 or 5 stitches and is
 *  that much taller; a round that begins with half an arch begins with a 한길긴뜨기 and `half` chains. 5 is the
 *  net every bag had before. */
export const NET: Record<number, { m: number; ht: number; half: number }> = { 3: { m: 3, ht: 1.1, half: 1 }, 5: { m: 4, ht: 1.45, half: 2 }, 7: { m: 5, ht: 1.8, half: 3 } };
export const netArch = (p: { netCh?: number | null }): 3 | 5 | 7 => (p.netCh === 3 || p.netCh === 7 ? p.netCh : 5);
/** named patterns written into a bag's rounds as one of the charts is (조개 무늬 is worked as the shell chart) */
const WALL_BY_PATTERN: Record<string, ChartKey> = { c43: "shell" };
/** the patterns whose rounds sit half a repeat over from the round below (Kim: 반 반복씩 엇갈리는 무늬). Worked
 *  round and joined, such a round begins with HALF a pattern and ends with the other half, so the round's start
 *  stays in one straight column - the seam was walked half a repeat sideways with slip stitches before, every
 *  round, and wandered round the bag. [the round with the halves, the full round over it, why] */
const WALL_HALF: Partial<Record<ChartKey, (r: number, c?: number) => [string, string, string]>> = {
  shell: r => [`사슬 3(한길긴뜨기 1코로 셉니다), 같은 코에 한길긴뜨기 2, (부채 가운데에 짧은뜨기 1, 다음 짧은뜨기에 한길긴뜨기 5) × ${r - 1}, 마지막 부채 가운데에 짧은뜨기 1, 처음 코에 한길긴뜨기 2, 사슬 3의 3번째 코에 빼뜨기`,
    `기둥사슬 1, (부채 가운데에 짧은뜨기 1, 다음 짧은뜨기에 한길긴뜨기 5) × ${r}, 첫 코에 빼뜨기`,
    "첫 부채 가운데는 아랫단 사슬 3의 3번째 코입니다"],
  moss: r => [`기둥사슬 1, 사슬 1, (사슬 사이에 짧은뜨기 1, 사슬 1) × ${r - 1}, 마지막 사슬 사이에 짧은뜨기 1, 첫 사슬에 빼뜨기`,
    `기둥사슬 1, (사슬 사이에 짧은뜨기 1, 사슬 1) × ${r}, 첫 코에 빼뜨기`,
    "첫 짧은뜨기는 아랫단을 시작한 사슬 사이에 뜹니다"],
  net: (r, c = 5) => { const h = NET[c].half; return [`사슬 ${3 + h}(한길긴뜨기 1 + 사슬 ${h}), (아치 가운데에 짧은뜨기 1, 사슬 ${c}) × ${r - 1}, 마지막 아치 가운데에 짧은뜨기 1, 사슬 ${h}, 사슬 ${3 + h}의 3번째 코에 빼뜨기`,
    `기둥사슬 1, 사슬 ${3 + h}의 3번째 코에 짧은뜨기 1, (사슬 ${c}, 아치 가운데에 짧은뜨기 1) × ${r - 1}, 사슬 ${c}, 첫 코에 빼뜨기`,
    "첫 짧은뜨기는 아랫단을 닫은 자리(반 아치 두 개가 만나는 곳)에 뜹니다"]; },
};
/** the chart a bag's body is written in round by round, if any */
const wallKeyOf = (p: PlanInput): ChartKey | null => p.crochetChart ?? (p.pattern && !(p.crochetStitch && p.crochetStitch !== "sc") ? WALL_BY_PATTERN[p.pattern] : undefined) ?? null;
const WALL_HALF_WHY: Partial<Record<ChartKey, string>> = { shell: "반 부채로 시작해 반 부채로 닫습니다", moss: "사슬(반 무늬)로 시작해 짧은뜨기로 닫습니다", net: "반 아치로 시작해 반 아치로 닫습니다" };
function bodyPattern(k: ChartKey, last: number, hCm: number, g: Gauge, arch = 5): { rows: RawRow[]; n: number; reps: number; rim: string; m: number } {
  const net = k === "net" && arch !== 5 ? NET[arch] : null;
  const m = net ? net.m : CHART_MULT[k][0], n = Math.max(m * 2, Math.round(last / m) * m), r = n / m, d = n - last, ht = net ? net.ht : WALL_HT[k];
  // the bottom's last round is fitted to the multiple already (planBottom), so this round only turns upward;
  // the evening is kept for a bottom that could not be fitted
  const rows: RawRow[] = [{ part: "body", n, inc: d,
    how: d > 0 ? `짧은뜨기 ${n}코 (늘림 ${d}코를 고르게 나눠서)` : d < 0 ? `짧은뜨기 ${n}코 (줄임 ${-d}번을 고르게 나눠서)` : `늘림 없이 짧은뜨기 ${n}코`,
    why: d ? `여기서부터 위로 올라갑니다 · 무늬가 ${m}코 단위라 ${n}코(${m} × ${r})로 맞춥니다 (${last}${d > 0 ? " + " : " - "}${Math.abs(d)})` : `여기서부터 위로 올라갑니다 · 한 바퀴 ${n}코 = 무늬 ${m}코 × ${r}회` }];
  const pr = Math.max(2, rnd(Math.max(0, hCm - g.h) / (g.h * ht)));
  const text: Record<ChartKey, [string, string, string]> = {
    shell: [`기둥사슬 1, (짧은뜨기 1, 2코 건너뛰고 한 코에 한길긴뜨기 5, 2코 건너뛰기) × ${r}, 첫 코에 빼뜨기`,
      `빼뜨기 3코로 첫 부채 가운데까지 옮겨 기둥사슬 1, (부채 가운데에 짧은뜨기 1, 아래 짧은뜨기에 한길긴뜨기 5) × ${r}, 첫 코에 빼뜨기`,
      `부채 ${r}개 · 단마다 반 칸씩 엇갈립니다`],
    mesh: [`사슬 4(한길긴뜨기 1 + 사슬 1), (1코 건너뛰고 한길긴뜨기 1, 사슬 1) × ${r - 1}, 사슬 4의 3번째 코에 빼뜨기`,
      `사슬 4, (아래 한길긴뜨기에 한길긴뜨기 1, 사슬 1) × ${r - 1}, 사슬 4의 3번째 코에 빼뜨기`,
      `구멍 ${r}개 · 구멍이 세로로 줄지어 섭니다`],
    vst: [`사슬 4(한길긴뜨기 1 + 사슬 1), 같은 코에 한길긴뜨기 1, (2코 건너뛰고 한 코에 한길긴뜨기 1 · 사슬 1 · 한길긴뜨기 1) × ${r - 1}, 사슬 4의 3번째 코에 빼뜨기`,
      `빼뜨기 1코로 첫 V의 사슬 사이로 옮겨 사슬 4, 같은 곳에 한길긴뜨기 1, (다음 V의 사슬 사이에 한길긴뜨기 1 · 사슬 1 · 한길긴뜨기 1) × ${r - 1}, 3번째 코에 빼뜨기`,
      `V ${r}개 · V 위에 V가 쌓입니다`],
    moss: [`기둥사슬 1, (짧은뜨기 1, 사슬 1, 1코 건너뛰기) × ${r}, 첫 코에 빼뜨기`,
      `빼뜨기 1코로 첫 사슬 사이로 옮겨 기둥사슬 1, (사슬 사이에 짧은뜨기 1, 사슬 1) × ${r}, 첫 코에 빼뜨기`,
      `${r}번 반복 · 단마다 반 칸씩 엇갈립니다`],
    net: [`기둥사슬 1, (짧은뜨기 1, 사슬 ${arch}, ${m - 1}코 건너뛰기) × ${r}, 첫 코에 빼뜨기`,
      `빼뜨기 3코로 첫 아치 가운데까지 옮겨 기둥사슬 1, (아치 가운데에 짧은뜨기 1, 사슬 5) × ${r}, 첫 코에 빼뜨기`,
      `아치 ${r}개 · 아치가 반 칸씩 엇갈려 마름모 구멍이 됩니다`],
  };
  const [first, next, why] = text[k], half = WALL_HALF[k]?.(r, arch);
  for (let i = 0; i < pr; i++) rows.push({ part: "body", n, inc: 0, hk: ht, own: true, wall: { k, i, reps: r, ...(net ? { ch: arch } : {}) },
    how: i === 0 ? first : half ? half[i % 2 ? 0 : 1] : next,
    why: i === 0 ? why : half ? (i % 2 ? `${n}코 그대로 · ${WALL_HALF_WHY[k]} · 단의 시작 자리는 그대로입니다` : `${n}코 그대로 · ${half[2]}`) : `${n}코 그대로` });
  const rim: Record<ChartKey, string> = { shell: "부채마다 6코", mesh: "한길긴뜨기에 1코, 사슬 사이에 1코", vst: "V의 사슬 사이에 2코, V 사이에 1코", moss: "짧은뜨기에 1코, 사슬 사이에 1코", net: `아치마다 ${m}코` };
  return { rows, n, reps: r, rim: rim[k], m };
}

function planSc(p: PlanInput): Plan {
  if (p.paint) return planPaint(p);
  if (p.free) return planFree(p);
  // 모자 기본형 (lib/wear): each its own way of being put together
  if (p.item === "buckethat") return planBucketHat(p, gauge(p), planBottom);
  if (p.item === "motifhat") return planMotifHat(p, gauge(p));
  if (p.item === "hoodscarf") return planHoodScarf(p, gauge(p), planBottom);
  if (p.item === "earflap") return planEarflap(p, gauge(p));
  if (p.item === "knotbag") return planKnotBag(p, gauge(p));
  if (p.item === "twoway") return planTwoWay(p, gauge(p));
  if (p.item === "balaclava") return planBalaclava(p, gauge(p));
  if (p.item === "motifscarf") return planMotifScarf(p, gauge(p));
  if (p.item === "bigsocks") return planBigSocks(p, gauge(p), planBottom);
  if (p.item === "knitfold") return planKnitFold(p, gauge(p));
  if (p.item === "knittop") return planKnitTop(p, gauge(p));
  if (p.item === "trapbag") return planTrapBag(p, gauge(p));
  if (p.item === "moonbag") return planMoonBag(p, gauge(p));
  if (p.item === "bonnet") return planBonnet(p, gauge(p), planBottom);
  if (p.item === "bustier") return planBustier(p, gauge(p));
  if (p.item === "halter") return planHalter(p, gauge(p), bodyPattern);
  if (p.item === "kerchief") { const g0 = gauge({ ...p, measuredH: null }); return planKerchief(p, p.measuredH ? { ...gauge(p), w: p.measuredW || g0.w } : g0, g0); }
  if (p.object === "rows" && p.taper) { const g0 = gauge({ ...p, measuredH: null }); return planTaper(p, p.measuredH ? { ...gauge(p), w: p.measuredW || g0.w } : g0, g0); }
  if (p.object === "rows") return planRows(p);
  if (p.object === "tube") return planTube(p);
  if (p.object === "bag" && p.build === "panels") return planPanels(p, gauge(p));
  if (p.object === "bag" && p.build === "hobo1") return planHobo(p, gauge(p));
  if (p.object === "bag" && p.build === "ribbed") return planRibbed(p, gauge({ ...p, crochetStitch: null }));
  const g = gauge(p);
  // a bag's body in a stitch pattern: the bottom ends on the pattern's multiple, and the body keeps that count
  // (an edging round in a stitch pattern - 폰 크로스백 - needs the opening's round to be its multiple too)
  const rep = p.object === "bag" ? repOf(p) ?? (p.rimChart ? { n: CHART_MULT[p.rimChart][0], plus: CHART_MULT[p.rimChart][1], rows: 1 } : null) : null, snap = (n: number) => rep ? fitCount(n, rep, false, rep.n) : n;
  const { rows: bottom, c, from } = planBottom(p, g, rep);
  // 보틀백 (lib/wear bottleDims): where the bag's sizes come from
  if (p.item === "bottlebag" && p.bottleD && p.bottleH && bottom[0]) bottom[0].why += ` · 병 지름 ${fmt(p.bottleD)}cm + 여유 ${p.a - p.bottleD > 0 ? fmt(p.a - p.bottleD) : 0}cm = 바닥 지름 ${fmt(p.a)}cm · 몸통은 병 높이 ${fmt(p.bottleH)}cm의 어깨까지 ${fmt((p.h as number) || 0)}cm`;
  const last = bottom[bottom.length - 1].n;
  const rows = bottom.slice() as Row[];
  if (p.object === "bag") {
    const prof = p.profile && p.profile.length >= 2 && p.profile[0] > 0 ? p.profile : null;
    // a drawn silhouette: rounds are worked ALONG the wall, one stitch-height of fabric each - where the wall flares
    // out a round gains less height - so the rounds are counted along the side curve's length, and each round is
    // as wide as the curve is where it lies (a hobo swells and gathers; counted by height it went flat and out)
    const side = prof ? (() => { const H = p.h as number, R0 = p.a / 2 / prof[0], N = 60, pts: [number, number][] = []; for (let i = 0; i <= N; i++) { const t = i / N; pts.push([R0 * profAt(prof, t), H * t]); }
      const acc = [0]; for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { pts, acc, L: acc[N], rAt: (sv: number) => { let i = 1; while (i < N && acc[i] < sv) i++; const f = (sv - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]); return pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f; } }; })() : null;
    const bodyRows = Math.max(2, rnd((side ? side.L : (p.h as number)) / g.h));
    // the opening's stitches: the bottom's last round scaled by the perimeter (circle: diameter ratio;
    // oval / rect: length and width both grow by topA - a, perimeter ~ 2 (a - b) + pi b)
    const b0 = (p.b as number) || p.a;
    // (사다리꼴 토트: only its width grows to the opening - a square bottom's round is 2 x (width + depth))
    const top = p.item === "traptote" && p.topA && p.topA !== p.a ? snap(Math.round(last * (p.topA + b0) / (p.a + b0)))
      : p.topA && p.topA !== p.a
      ? snap(Math.round(last * (p.shape === "circle" ? p.topA / p.a : (2 * (p.a - b0) + Math.PI * (b0 + p.topA - p.a)) / (2 * (p.a - b0) + Math.PI * b0))))
      : last;
    let prevN = last;
    // a stitch pattern on the body (Kim: 무늬 별로 코 수 주의): the first round evens the stitches to the
    // pattern's multiple, then the pattern's rounds - as many as its taller rounds take to reach the height
    const wk = wallKeyOf(p);
    const wall = wk ? bodyPattern(wk, last, (p.h as number) || 0, g, netArch(p)) : null;
    if (wall) { rows.push(...(wall.rows as Row[])); prevN = wall.n; }
    else for (let i = 0; i < bodyRows; i++) {
      if (!prof && top === last) { rows.push({ part: "body", n: last, how: `늘림 없이 짧은뜨기 ${last}코`, why: i === 0 ? "여기서부터 위로 올라갑니다" : `${last}코 그대로`, inc: 0 } as Row); continue; }
      // widening body: the extra stitches spread evenly over the rows (round 1 of the body stays straight)
      // a drawn silhouette: each row as wide as the drawing is at its height (never more than half again, nor less
      // than two thirds, of the row below, so every row can be worked); else spread evenly to the opening
      // (in a stitch pattern a shaped body widens and narrows by whole repeats: snap)
      const n = snap(i === 0 ? last : side ? clamp(Math.round(last * side.rAt(side.L * i / (bodyRows - 1)) / side.rAt(0)), Math.ceil(prevN * .67), Math.floor(prevN * 1.5)) : Math.round(last + (top - last) * i / (bodyRows - 1))), inc = n - prevN;
      rows.push({ part: "body", n, how: inc > 0 ? `짧은뜨기 ${n}코 (늘림 ${inc}코를 고르게 나눠서)` : inc < 0 ? `짧은뜨기 ${n}코 (줄임 ${-inc}번을 고르게 나눠서)` : `늘림 없이 짧은뜨기 ${n}코`,
        why: i === 0 ? "여기서부터 위로 올라갑니다" : inc > 0 ? `${prevN} + 늘림 ${inc} = ${n} · 위로 갈수록 넓어집니다` : inc < 0 ? `${prevN} - 줄임 ${-inc} = ${n} · 위로 갈수록 좁아집니다` : `${n}코 그대로`, inc } as Row);
      prevN = n;
    }
    const rimN = prevN;
    // 끈으로 조이기 (Kim): an eyelet round under the rim - a chain over every other stitch - and a cord through it,
    // about one and a half times the opening's length. Only when picked: patterns without it are as before.
    const pack = p.item === "backpack";
    if (p.closure === "drawstring" || pack) {
      const holes = Math.floor(rimN / 2), cord = Math.round(rimN * g.w * 1.5);
      rows.push({ part: "rim", n: rimN, how: `끈 구멍 단: (사슬 1, 1코 건너뛰고 짧은뜨기 1) × ${holes}${rimN % 2 ? ", 짧은뜨기 1" : ""}`,
        why: pack ? `구멍 ${holes}개 · 조임끈이 이 구멍을 지나 어깨끈이 됩니다` : `구멍 ${holes}개 · 사슬 끈 약 ${cord}cm를 꿰어 조입니다`, inc: 0 } as Row);
    }
    // (a handle grown out of the opening is the body going on: no edging between them - Kim: 같은 무늬로 쭉
    // 이어가는데 경계선이 생기면 안 된다. Its rows are worked straight on from the body's last round, and its own
    // edging rounds finish what is left of the opening.)
    const grown = p.handle !== "none" && !!p.handle && p.handleKind === "grown";
    // 테두리에서 사슬로 띄운 손잡이 (Kim: 네트백): the rim is three rounds of 짧은뜨기 - the second leaves a chain
    // standing over the front and one over the back (as long as the handle, the stitches under it skipped), the
    // third works over the chains too. Nothing is sewn on.
    const slots = p.handle !== "none" && !!p.handle && p.handleKind === "rim";
    if (slots) {
      const N = rimN, front = Math.ceil(N / 2), back = N - front, len = p.handleCm && p.handleCm > 0 ? p.handleCm : 40;
      const B = clamp(rnd(N * .16), 2, Math.max(2, Math.floor(back / 2))), C = Math.max(B + 2, rnd(len / (g.w * 0.85)));
      const A = Math.floor((front - B) / 2), b2 = Math.floor((back - B) / 2), D = (front - B - A) + b2, E = back - B - b2, n2 = N - 2 * B + 2 * C;
      rows.push({ part: "rim", n: N, how: wall ? `무늬 위에 짧은뜨기 ${N}코 (${wall.rim})` : `짧은뜨기 ${N}코`, why: "입구를 단단하게 · 다음 단에서 손잡이를 이 테두리에 이어 뜹니다", inc: 0 } as Row);
      rows.push({ part: "rim", n: n2, how: `짧은뜨기 ${A}코, 사슬 ${C}코를 띄우고 ${B}코 건너뛰기, 짧은뜨기 ${D}코, 사슬 ${C}코를 띄우고 ${B}코 건너뛰기, 짧은뜨기 ${E}코`,
        why: `손잡이 ${len}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm = 사슬 ${C}코 · 앞과 뒤에서 ${B}코씩 건너뜁니다 · ${N} - ${2 * B} + ${2 * C} = ${n2}`, inc: n2 - N } as Row);
      rows.push({ part: "rim", n: n2, how: `짧은뜨기 ${n2}코 (사슬은 감싸며 사슬 수만큼)`, why: "손잡이와 입구를 한 번 더 단단하게", inc: 0 } as Row);
    }
    // 입구 테두리 무늬 (Kim: 폰 크로스백 - 지금 무늬 엔진에서): a round of 짧은뜨기, then the pattern's own first round as the edge
    const edging = !grown && !slots && !wall && p.rimChart ? bodyPattern(p.rimChart, rimN, 0, g) : null;
    if (edging) {
      rows.push({ part: "rim", n: rimN, how: `짧은뜨기 ${rimN}코`, why: `입구를 단단하게 · 한 바퀴 ${rimN}코 = 무늬 ${edging.m}코 × ${edging.reps}회`, inc: 0 } as Row);
      rows.push({ ...edging.rows[1], part: "rim", why: `테두리 무늬 한 단 · ${edging.rows[1].why}` } as Row);
    }
    // 링 손잡이백 (Kim: 금속 링에 입구를 감싸 붙이기): after one round of 짧은뜨기, the front's and the back's middle
    // stitches are worked round a ring each (the ring inside the stitch), a few left at each side as a slit
    const ring = p.item === "ringbag" ? ringWrap(p, g, rimN) : null;
    for (let i = 0; i < (grown || slots || edging ? 0 : ring ? 1 : 2); i++) rows.push({ part: "rim", n: rimN, how: i === 0 ? (wall ? `무늬 위에 짧은뜨기 ${rimN}코 (${wall.rim})` : `짧은뜨기 ${rimN}코`) : `빼뜨기 ${rimN}코로 마무리`, why: i === 0 && wall ? `무늬 ${wall.reps}회 × ${wall.m}코 = ${rimN}코 · 입구를 단단하게` : "입구를 단단하게", inc: 0 } as Row);
    // (호보백에는 덮개가 없다 - Kim: a handle grown out of the opening leaves no edge for a flap to fall from)
    if (p.flapCm && p.flapCm > 0 && !grown) {
      // over the top (Kim): it crosses the top's width first (as wide as the bottom is, b), then falls - more rows
      const over = p.flapOver === "top" && p.shape !== "circle" && p.gusset !== "flat" ? Math.max(0, (p.b as number) || 0) : 0;
      // where the flap is worked from (Kim): the back's own top edge. The top closed (오므림): half the rim. A body
      // with width: the top a rectangle, the flap from its back long side only - the two short (depth) sides and
      // the front left out
      const bw = (p.b as number) || 0, thick = p.shape !== "circle" && p.gusset !== "flat" && bw > 0 && (p.gusset === "box" || p.flapOver === "top");
      const fn = Math.max(4, thick ? Math.round(rimN * p.a / (2 * p.a + 2 * bw)) : Math.round(rimN / 2)), fr = Math.max(2, rnd((p.flapCm + over) / g.h)), fo = over ? rnd(over / g.h) : 0;
      const from = thick ? `뒤판 윗변 ${fn}코 (옆면 두 변과 앞판은 빼고)` : `입구 둘레의 절반, 뒤판 ${fn}코`;
      // 사선 / 삼각형 (lib/structure): the flap loses stitches at an edge, or at both, down to its tip
      const tf = p.taper ? taperFlap(fn, fr, p.taper, p.taperTip, p.taperCord ? { cm: p.taperCordCm && p.taperCordCm > 0 ? p.taperCordCm : 20, g } : null) : null;
      // 계단 덮개 (Kim: 몇 단마다 양 끝을 몇 코씩 줄이는 계단): every `sr` rows the row begins `ss` stitches in (slipped
      // over) and stops `ss` short - a step at each end; never down to under two stitches
      const sr = !tf && p.flapStepRows && p.flapStepSt ? clamp(Math.round(p.flapStepRows), 1, 12) : 0, ss = sr ? clamp(Math.round(p.flapStepSt as number), 1, 12) : 0, stair: number[] = [];
      if (sr) { let cur = fn; for (let i = 0; i < fr; i++) { if (i && i % sr === 0 && cur - 2 * ss >= 2) cur -= 2 * ss; stair.push(cur); } }
      for (let i = 0; i < fr; i++) {
        if (sr && i) {
          const n = stair[i], down = n < stair[i - 1], last = i === fr - 1 ? " · 가운데에 사슬 고리(단추 구멍)" : "";
          rows.push({ part: "flap", n, inc: down ? -2 * ss : 0, edge: down ? [-ss, -ss] : [0, 0], ...(down ? { step: ss } : {}),
            how: down ? `사슬 1, 뒤집어서 첫 ${ss}코는 빼뜨기로 건너가고 짧은뜨기 ${n}코, 마지막 ${ss}코는 남깁니다${last}` : `사슬 1, 뒤집어서 짧은뜨기 ${n}코${last}`,
            why: down ? `${stair[i - 1]} - ${2 * ss} = ${n} · ${sr}단마다 양 끝에서 ${ss}코씩 계단처럼 줄입니다` : `${n}코 그대로` } as Row);
          continue;
        }
        const n = tf ? tf.t.counts[i] : fn, end = i === fr - 1 && !(tf && tf.cord.length) ? " · 가운데에 사슬 고리(단추 구멍)" : fo && i === fo ? " · 여기서부터 앞으로 꺾여 내려옵니다" : "";
        rows.push({ part: "flap", n, how: i === 0 ? `뒤판 마지막 단에 이어서 ${from}에 짧은뜨기 ${fn}코` : tf ? tf.how(i) + end : `사슬 1, 뒤집어서 짧은뜨기 ${fn}코${end}`,
          why: i === 0 ? `${thick ? `윗면 ${p.a} × ${bw}cm 중 뒤쪽 가로 한 변` : `입구 ${rimN}코의 절반`} = ${fn}코 · ${over ? `윗면 ${over}cm + ` : ""}덮개 ${p.flapCm}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${fr}단${tf ? ` · ${taperNote(fn, tf.t, p.taper!)}` : ""}` : tf ? tf.why(i) : `${fn}코 그대로`,
          inc: tf ? n - tf.t.counts[Math.max(0, i - 1)] : 0, ...(tf ? { edge: tf.edge(i), work: tf.work(i) } : sr ? { edge: [0, 0] as [number, number] } : {}) } as Row);
      }
      if (tf) rows.push(...tf.cord);
    }
    if (p.handle !== "none") {
      const len = p.handleCm && p.handleCm > 0 ? p.handleCm : p.handle === "long" ? 90 : 25, ch = rnd(len / (g.w * 0.85));
      if (grown) {
        const G = grownHandle(p, g, rimN), K = CROCHET[G.st].ko, tc = CROCHET[G.st].turn, tog = `${K} 2코 모아뜨기`, U = G.u, pat = !!G.wk;
        // (a strap worked whole from one side and joined at the other - Kim: 슬라우치 토트: as many rows as the two halves together)
        const far = !!p.handleFar, hRows = far ? 2 * G.rows : G.rows;
        for (const side of (far ? [0] : [0, 1]) as (0 | 1)[]) {
          const name = far ? "끈" : side ? "반대쪽" : "한쪽", from = side ? `사이 ${G.gapA}코를 두고 반대쪽 옆선을 가운데로` : "입구 한쪽 옆선을 가운데로";
          for (let i = 0; i < hRows; i++) {
            const n = i <= G.dec ? G.base - 2 * U * i : G.strap, k = i === 0 ? "pick" as const : i <= G.dec ? "dec" as const : "even" as const, last = i === hRows - 1;
            const tail = last ? far ? ` · 실을 길게 남기고 잘라 반대쪽 옆선의 같은 ${G.strap}코에 맞대고 감침질로 잇습니다` : side ? " · 실을 길게 남기고 잘라 한쪽 끝과 맞대고 감침질로 잇습니다" : " · 실을 자르고 반대쪽을 뜹니다" : "";
            const how = pat
              ? (k === "pick" ? `${from} ${G.base}코에 새 실을 걸어 몸통 무늬를 그대로 이어 ${n / U}개`
                : k === "dec" ? `뒤집어서 첫 무늬는 빼뜨기로 건너가고, 무늬 ${n / U}개를 뜬 뒤 마지막 무늬는 뜨지 않습니다`
                : `뒤집어서 무늬대로 ${n / U}개${tail}`)
              : (k === "pick" ? `${from} ${G.base}코에 새 실을 걸어 사슬 ${tc}, ${K} ${G.base}코`
                : k === "dec" ? `사슬 ${tc}, 뒤집어서 ${n > 2 ? `${tog}, ${K} ${n - 2}코, ${tog}` : `${tog} 2번`}`
                : `사슬 ${tc}, 뒤집어서 ${K} ${n}코${tail}`);
            const why = k === "pick" ? (side ? `한쪽과 같은 ${G.base}코 · 남는 ${G.gapB}코가 반대편 사이 자리입니다`
                : `입구 ${rimN}코 = 손잡이 ${G.base}코 + 사이 ${G.gapA}코 + 손잡이 ${G.base}코 + 사이 ${G.gapB}코 · 밑너비 ${fmt(G.baseCm)}cm ÷ ${pat ? `무늬 하나 ${fmt(g.w * U * 10)}mm` : `코 너비 ${fmt(g.w * 10)}mm`} · 몸통 마지막 단에서 같은 ${pat ? "무늬" : K}로 바로 이어 뜹니다 · 이음선이 기울어지므로 가방을 펴 놓고 단수링으로 자리를 먼저 표시합니다`)
              : k === "dec" ? (pat ? `무늬 ${n / U + 2} - 2 = ${n / U}개 (${n}코) · 양 끝에서 무늬 하나씩` : `${n + 2} - 줄임 2 = ${n} · 양 끝에서 한 코씩`)
              : i === G.dec + 1 ? `끈 너비 ${fmt(G.strap * g.w)}cm = ${pat ? `무늬 ${n / U}개 (${n}코)` : `${G.strap}코`} · 길이 ${fmt(G.lenCm)}cm의 절반 ÷ 단 높이 ${fmt(G.rh * 10)}mm = ${G.rows}단${far ? ` · 한쪽에서 끝까지 ${hRows}단` : ""}` : pat ? `무늬 ${n / U}개 그대로` : `${n}코 그대로`;
            rows.push({ part: "handle", n, how, why, inc: k === "dec" ? -2 * U : 0, own: true, grown: { k, side, st: G.st, ...(pat ? { unit: U } : {}) }, label: `손잡이 ${name} ${i + 1}단` } as Row);
          }
        }
        for (const side of [0, 1] as const) {
          const gap = side ? G.gapB : G.gapA, n = gap + G.ends;
          rows.push({ part: "handle", n, how: `${side ? "반대편" : "한편"} 가장자리를 따라 사슬 1, 짧은뜨기 ${n}코 (사이 ${gap}코에 1코씩, 손잡이 옆면 ${2 * G.rows}단에 ${G.ends}코를 고르게), 첫 코에 빼뜨기`,
            why: `옆면 ${2 * G.rows}단 × 단 높이 ${fmt(G.rh * 10)}mm ÷ 코 너비 ${fmt(g.w * 10)}mm = ${G.ends}코 · 가장자리가 늘어지지 않게 잡아 줍니다`, inc: 0, own: true, grown: { k: "edge", side, st: "sc" }, label: `가장자리 ${side + 1}` } as Row);
        }
      }
      else if (slots) { /* the handles are in the rim's rounds */ }
      else if (p.handleKind === "wrist") rows.push({ part: "handle", n: ch, how: `사슬 ${ch}코 (약 ${len}cm), 짧은뜨기로 되돌아 뜨고 두 끝을 입구 한쪽 모서리에 함께 연결`, why: `손목 고리 ${len}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm`, inc: 0 } as Row);
      else for (let i = 0; i < 2; i++) rows.push({ part: "handle", n: ch, how: `사슬 ${ch}코 (약 ${len}cm), 짧은뜨기로 되돌아 뜨고 양쪽에 연결`, why: `${len}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm`, inc: 0 } as Row);
    }
  }
  if (p.object === "bag" && p.item === "ringbag") {
    const W = ringWrap(p, g, openingN({ rows }));
    for (const [q, side] of ["앞", "뒤"].entries()) rows.push({ part: "handle", n: W.n, inc: 0, own: true, label: `링 ${q + 1}`,
      how: `입구 ${side}쪽 가운데 ${W.n}코를 링에 감싸며 짧은뜨기 ${W.n}코 (양 끝 ${W.slit}코씩은 옆트임으로 남깁니다)`,
      why: q ? `링 1과 같은 ${W.n}코` : `입구 ${W.rimN}코의 절반 ${W.half}코 가운데 ${W.n}코 · 링 지름 ${fmt(W.cm)}cm의 둘레 ${fmt(W.round)}cm 가운데 ${fmt(W.n * g.w)}cm를 감쌉니다` + (W.tight ? " · 링보다 넓어 코를 모아 가며 감쌉니다" : "") } as Row);
  }
  // 체인 걸이 (Kim: 코인 미니백 - 양 옆에 체인을 걸 고리; 클러치의 체인 끈 옵션): a small loop at each side of the opening
  if (p.object === "bag" && (p.item === "coinbag" || p.chainLoops)) {
    const k = Math.max(3, rnd(CHAIN_LOOP / (g.w * 0.85)));
    for (const q of [0, 1]) rows.push({ part: "handle", n: k, inc: 0, own: true, label: `체인 고리 ${q + 1}`,
      how: `사슬 ${k}코 (약 ${fmt(CHAIN_LOOP)}cm), 빼뜨기로 되돌아와 입구 ${q ? "반대쪽" : "한쪽"} 옆선에 고리로 연결`,
      why: `고리 ${fmt(CHAIN_LOOP)}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm = ${k}코` + (q ? "" : " · 체인 끈을 여기에 겁니다") } as Row);
  }
  // 드로스트링 백팩 (Kim: 끈 하나가 입구를 조이고 어깨끈이 되는 구조): a loop at each side of the bottom, and one
  // cord - through the eyelet round, each end down to a loop - that closes the top and is the two straps
  if (p.object === "bag" && p.item === "backpack") {
    const P = packCord(p, g, openingN({ rows }));
    for (const q of [0, 1]) rows.push({ part: "handle", n: P.loop, inc: 0, own: true, label: `아래 고리 ${q + 1}`,
      how: `사슬 ${P.loop}코 (약 ${fmt(PACK_LOOP)}cm), 짧은뜨기로 되돌아 뜨고 두 끝을 바닥 가장자리 ${q ? "반대쪽" : "한쪽"} 옆에 함께 연결`,
      why: `고리 ${fmt(PACK_LOOP)}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm = ${P.loop}코` + (q ? "" : " · 바닥 마지막 단의 양옆, 서로 마주 보는 자리입니다") } as Row);
    rows.push({ part: "handle", n: P.cord, inc: 0, own: true, label: "조임끈",
      how: `사슬 ${P.cord}코 (약 ${P.cm}cm), 빼뜨기로 되돌아옵니다. 끈 구멍 단에 한 바퀴 꿰어 양 끝을 아래 고리에 하나씩 묶습니다`,
      why: `입구 둘레 ${fmt(P.rimCm)}cm + 어깨끈 ${fmt(P.strap)}cm × 2 = ${P.cm}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm = ${P.cord}코` } as Row);
  }
  let bi = 0, bo = 0, ri = 0, fl = 0, ha = 0;
  rows.forEach((r, i) => {
    r.idx = i;
    if (r.part === "bottom") { r.no = ++bi; r.label = `${bi}단`; }
    else if (r.part === "body") r.label = `${bottom.length + (++bo)}단`;
    else if (r.part === "rim") r.label = `테두리 ${++ri}`;
    else if (r.part === "flap") r.label = `덮개 ${++fl}`;
    else if (r.part === "handle" && !r.grown && !r.own) r.label = `손잡이 ${++ha}`;
  });
  // what the pattern did to the size: the round's stitches over the width of the piece laid flat (a round bottom:
  // its diameter; an oval or a square one: its length, the round shared by its two long sides)
  const fit: Fit | null = rep && from != null && from !== last ? { n: rep.n, plus: 0, from, to: last, cm: Math.round((last - from) * g.w / (p.shape === "circle" ? Math.PI : 2) * 10) / 10, of: "width", flat: false } : null;
  return { g, c, rows, bottomRounds: bottom.length, bodyRows: rows.filter(r => r.part === "body").length, last, ...(fit ? { fit } : {}) };
}

/** a chain hook's loop (cm); a ring handle's diameter when none is typed, and the share of half the opening it takes */
export const CHAIN_LOOP = 2.5, RING_CM = 12, RING_SHARE = .8;
/** 링 손잡이백: half the opening's round, its middle 80% worked round the ring - never more than three quarters of
 *  the ring's own round holds (then the stitches are gathered on it) */
export function ringWrap(p: Pick<PlanInput, "ringCm">, g: { w: number }, rimN: number) {
  const cm = p.ringCm && p.ringCm > 0 ? p.ringCm : RING_CM, round = Math.PI * cm, half = Math.floor(rimN / 2), n = Math.max(4, Math.min(half, Math.round(half * RING_SHARE)));
  return { cm, round, rimN, half, n, slit: Math.max(0, Math.floor((half - n) / 2)), tight: n * g.w > round * .75 };
}
/** 드로스트링 백팩: a bottom loop's length, a strap's length when none is typed (cm) */
export const PACK_LOOP = 5, PACK_STRAP = 70;
/** the backpack's cord: once round the opening and a strap down each side; and a bottom loop's chains */
export function packCord(p: Pick<PlanInput, "tieCm">, g: { w: number }, rimN: number) {
  const strap = p.tieCm && p.tieCm > 0 ? p.tieCm : PACK_STRAP, rimCm = rimN * g.w, cm = Math.round(rimCm + 2 * strap);
  return { strap, rimCm, cm, cord: Math.max(4, rnd(cm / (g.w * 0.85))), loop: Math.max(3, rnd(PACK_LOOP / (g.w * 0.85))) };
}

export function outline(shape: Shape, r: number, g: Gauge, c: number): { at: (t: number) => [number, number] } {
  const rad = r * g.h;
  if (shape === "circle") return { at: (t) => { const a = -Math.PI / 2 + t * 2 * Math.PI; return [rad * Math.cos(a), rad * Math.sin(a)]; } };
  const a = (c - 1) * g.w;
  if (shape === "oval") {
    const per = 2 * a + 2 * Math.PI * rad;
    return { at: (t) => {
      let s = t * per;
      if (s < a) return [-a / 2 + s, -rad]; s -= a;
      if (s < Math.PI * rad) { const ang = -Math.PI / 2 + s / rad; return [a / 2 + rad * Math.cos(ang), rad * Math.sin(ang)]; } s -= Math.PI * rad;
      if (s < a) return [a / 2 - s, rad]; s -= a;
      const ang = Math.PI / 2 + s / rad; return [-a / 2 + rad * Math.cos(ang), rad * Math.sin(ang)];
    } };
  }
  const hx = a / 2 + rad, hy = rad, per = 4 * hx + 4 * hy;
  return { at: (t) => {
    let s = t * per;
    if (s < 2 * hx) return [-hx + s, -hy]; s -= 2 * hx;
    if (s < 2 * hy) return [hx, -hy + s]; s -= 2 * hy;
    if (s < 2 * hx) return [hx - s, hy]; s -= 2 * hx;
    return [-hx, hy - s];
  } };
}

export interface Dot { x: number; y: number; inc: boolean }
export interface DotRound { r: number; pts: Dot[] }

export function dots(pp: Plan, shape: Shape, rounds: number): DotRound[] {
  const out: DotRound[] = [];
  for (let r = 1; r <= rounds; r++) {
    const n = pp.rows[r - 1].n, inc = pp.rows[r - 1].inc, o = outline(shape, r, pp.g, pp.c), pts: Dot[] = [];
    const off = shape === "circle" && r % 2 ? 0.5 / n : 0;
    for (let i = 0; i < n; i++) { const [x, y] = o.at(((i + 0.5) / n + off) % 1); pts.push({ x, y, inc: false }); }
    // a last round fitted to a stitch pattern (planBottom): its own number of increases, spread evenly - round the
    // whole round of a circle, round the two ends of an oval or a square
    const fitted = shape === "circle" ? n !== 6 * r : r > 1 && inc !== (shape === "oval" ? 6 : 8);
    if (inc && fitted) {
      const half = (pp.c - 1) * pp.g.w / 2, at = shape === "circle" ? pts : pts.filter(pt => Math.abs(pt.x) > half), pool = at.length >= inc ? at : pts, k = Math.min(inc, pool.length);
      pool.forEach((pt, i) => { pt.inc = Math.floor((i + 1) * k / pool.length) !== Math.floor(i * k / pool.length); });
    } else if (inc) {
      if (shape === "circle") pts.forEach((pt, i) => { pt.inc = r === 2 || (r >= 3 && i % (r - 1) === r - 2); });
      else {
        const targets: [number, number][] = [], a = (pp.c - 1) * pp.g.w, rad = r * pp.g.h;
        if (shape === "oval") for (const sx of [1, -1]) for (let k = 0; k < 3; k++) { const ang = -Math.PI / 2 + (k + 0.5) / 3 * Math.PI; targets.push([sx * (a / 2 + rad * Math.cos(ang)), sx * rad * Math.sin(ang)]); }
        else { const hx = a / 2 + rad; for (const [cx, cy] of [[hx, -rad], [hx, rad], [-hx, rad], [-hx, -rad]]) { targets.push([cx * 0.97, cy * 0.85], [cx * 0.88, cy * 0.98]); } }
        for (const [tx, ty] of targets) { let best: Dot | null = null, bd = 1e9; for (const pt of pts) { if (pt.inc) continue; const d = (pt.x - tx) ** 2 + (pt.y - ty) ** 2; if (d < bd) { bd = d; best = pt; } } if (best) best.inc = true; }
      }
    }
    out.push({ r, pts });
  }
  return out;
}

// ---- sizes that hold whole repeats (Kim: 크기 조절은 "반복 수"와 "단 수"로) ----
/** Where a size slider (or the 3D's size frame) stops while a stitch pattern is on: the size nearest `v` at which
 *  the piece holds whole repeats across (`a`: the width, the circumference, a bottom's length) or whole sets of
 *  the pattern's rows up (`b` of a flat piece, `h`). Null: that size is free - plain stitches (짧은뜨기 ...), a
 *  pattern with no fixed repeat, a drawn piece. The size is given to 0.1cm; a stitch is 3mm and more, so the
 *  count it stands for does not move.
 *    flat piece    width (n k + plus) x stitch width          length  rows k x row height
 *    tube          circumference n k x stitch width           height  rows k x row height
 *    bag, round    a whole bottom round at a time (6 stitches; a repeat when that is more), the last round fitted
 *    bag, oval/sq  length: one repeat more round the bottom = half a repeat of chain; width: whole rounds
 *    bag, height   whole sets of the pattern's rounds over the round that turns upward */
export function snapSize(p: PlanInput, key: "a" | "b" | "h", v: number): number | null {
  if (p.free || p.paint || !(v > 0)) return null;
  const rep = repOf(p); if (!rep) return null;
  const g = gauge(p), g0 = gauge({ ...p, measuredH: null }), across = rep.n > 1, up = rep.rows > 1;
  const near = (step: number, off = 0, min = 1) => Math.round((off + Math.max(min, Math.round((v - off) / step)) * step) * 10) / 10;
  if (p.object === "rows") return key === "a" ? (across ? near(rep.n * g0.w, rep.plus * g0.w) : null) : key === "b" && up ? near(rep.rows * g.h) : null;
  if (p.object === "tube") return key === "a" ? (across ? near(rep.n * g0.w, 0, Math.ceil(6 / rep.n)) : null) : key === "h" && up ? near(rep.rows * g.h) : null;
  if (p.object !== "bag") return null;
  if (key === "h") {
    const wk = wallKeyOf(p);
    if (wk) return near(rep.rows * (wk === "net" ? NET[netArch(p)].ht : WALL_HT[wk]) * g.h, g.h, Math.ceil(2 / rep.rows));
    return up ? near(rep.rows * g.h) : null;
  }
  if (!across) return null;
  if (p.shape === "circle") return key === "a" ? near(Math.max(6, rep.n) * g.h / 3, 0, Math.ceil(18 / Math.max(6, rep.n))) : null;
  const flat = p.gusset === "flat", per = p.shape === "oval" ? 6 : 8;
  if (key === "b") return flat ? null : near(2 * g.h, 0, 3);
  // the round is 2 x (the straight in stitches) + what the ends hold; a flat pouch's one round is always even
  const R = flat ? 1 : Math.max(3, rnd(((p.b as number) / 2) / g.h)), ends = 6 + per * (R - 1), n = flat && rep.n % 2 ? rep.n * 2 : rep.n;
  return near(n * g.w / 2, (flat ? g.w * 2 : (p.b as number)) - ends * g.w / 2, Math.ceil((ends + 4) / n));
}

// ---- flat pieces worked back and forth, and tubes worked in the round (scarf, dishcloth, neck warmer...) ----
// Both use gauge() as is. The stitch count comes from the gauge before any measurement: once the start
// chain is made it never changes; a measurement (after 5 rows) only corrects the number of rows.

function labelFlat(rows: Row[]) {
  let k = 0;
  rows.forEach((r, i) => { r.idx = i; if (r.part === "start") r.label = "시작 사슬"; else { r.no = ++k; r.label = `${k}단`; } });
}

/** Flat rectangle in single crochet, back and forth. a = width, b = length (cm).
 *  start chain = round(width / stitch width) + 1 (turning chain); every row = round(width / stitch width);
 *  rows = round(length / stitch height); chain 1 and turn at the end of each row; no increases. */
export function planRows(p: PlanInput): Plan {
  const g0 = gauge({ ...p, measuredH: null }), g = p.measuredH ? { ...gauge(p), w: p.measuredW || g0.w } : g0;
  // a stitch pattern worked back and forth: its multiple and its edge stitches (n x k + plus), nearest the width
  const n0 = Math.max(2, rnd(p.a / g0.w)), rep = repOf(p), n = fitCount(n0, rep, true, 2), R = Math.max(2, rnd((p.b as number) / g.h));
  const fitted = n !== n0 && rep ? ` → 무늬 ${rep.n}코 × ${(n - rep.plus) / rep.n}${rep.plus ? ` + ${rep.plus}` : ""} = ${n}코` : "";
  const rows = [{ part: "start", n: n + 1, how: `사슬 ${n + 1}코`, why: `폭 ${p.a}cm ÷ 코 너비 ${fmt(g0.w * 10)}mm = ${n0}코${fitted}, 기둥 사슬 1코 더`, inc: 0 }] as Row[];
  rows.push({ part: "rows", n, how: `두 번째 사슬부터 짧은뜨기 ${n}코`, why: "첫 단", inc: 0 } as Row);
  for (let r = 2; r <= R; r++) rows.push({ part: "rows", n, how: `사슬 1, 뒤집어서 짧은뜨기 ${n}코`, why: r === 2 ? `길이 ${p.b}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${R}단` : `${n}코 그대로`, inc: 0 } as Row);
  labelFlat(rows);
  return { g, c: n + 1, rows, bottomRounds: 0, bodyRows: R, last: n, ...(n !== n0 && rep ? { fit: { n: rep.n, plus: rep.plus, from: n0, to: n, cm: Math.round((n - n0) * g0.w * 10) / 10, of: "width" as const, flat: true } } : {}) };
}

/** Tube without a bottom, in the round. a = circumference, h = height (cm).
 *  start chain = round(circumference / stitch width), joined with a slip stitch;
 *  rounds = round(height / stitch height); no increases. */
export function planTube(p: PlanInput): Plan {
  const g0 = gauge({ ...p, measuredH: null }), g = p.measuredH ? { ...gauge(p), w: p.measuredW || g0.w } : g0;
  // a stitch pattern worked in the round: its multiple alone (no edge stitches - the round has no edges)
  const n0 = Math.max(6, rnd(p.a / g0.w)), rep = repOf(p), n = fitCount(n0, rep, false, 6), R = Math.max(2, rnd((p.h as number) / g.h));
  const fitted = n !== n0 && rep ? ` → 무늬 ${rep.n}코 × ${n / rep.n} = ${n}코` : "";
  const rows = [{ part: "start", n, how: `사슬 ${n}코, 꼬이지 않게 빼뜨기로 고리 연결`, why: `둘레 ${p.a}cm ÷ 코 너비 ${fmt(g0.w * 10)}mm = ${n0}코${fitted}`, inc: 0 }] as Row[];
  for (let r = 1; r <= R; r++) rows.push({ part: "rounds", n, how: `짧은뜨기 ${n}코, 첫 코에 빼뜨기`, why: r === 1 ? `높이 ${p.h}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${R}단` : `${n}코 그대로`, inc: 0 } as Row);
  labelFlat(rows);
  return { g, c: n, rows, bottomRounds: 0, bodyRows: R, last: n, ...(n !== n0 && rep ? { fit: { n: rep.n, plus: 0, from: n0, to: n, cm: Math.round((n - n0) * g0.w * 10) / 10, of: "round" as const, flat: false } } : {}) };
}

// ---- 기둥사슬 (standing / turning chain) in the instructions ----
// Every row and round here is single crochet, so each starts with 1 chain up to the stitch height - the
// 기둥사슬 - which is not counted as a stitch (for 한길긴뜨기 and taller it would be 3+ and count as the
// first stitch). Rounds are joined: 기둥사슬 1 at the start, a slip stitch into the first stitch at the end
// (a slip stitch has no height, so the rim's slip-stitch round needs no 기둥사슬). Rows turn after it.
// The engine above stays as the prototype had it (tests/pattern.test.ts checks it against the original);
// this only rewrites the text the pattern and the knitting screen show, and marks the rows that have one
// (`turn`, the chains: drawn on the chart).
// The 기둥사슬 belongs to the start of the row it raises, never to the chain before it: a foundation
// written as "사슬 9코, 둘째 코부터" is 사슬 8코 (the base) + 기둥사슬 1 (the next row's start), so it is
// written that way, and a rows piece starts with the base chain alone ("사슬 18코"), its row 1 with the
// 기둥사슬 (Kim's correction).
export const TURN_CH = 1;
export function withChains(pp: Plan): Plan {
  const TC = pp.turn ?? TURN_CH;
  const rows = pp.rows.map((r): Row & { turn?: number } => {
    if (r.own) return r; // a stitch pattern's round carries its own chain and closing stitch (it had both twice)
    const round = r.part === "bottom" || r.part === "body" || (r.part === "rim" && !r.how.startsWith("빼뜨기"));
    if (round) {
      if (r.how.startsWith("매직링에 ")) return { ...r, how: `매직링에 기둥사슬 ${TC}, ${r.how.slice(5)}, 첫 코에 빼뜨기`, turn: TC };
      // oval / rect round 1: "사슬 c코, 둘째 코부터 ..." = a base of c - 1 chains, then the 기둥사슬
      const m = r.how.match(/^사슬 (\d+)코, 둘째 코부터 (.*)$/);
      if (m) {
        const c = Number(m[1]);
        return { ...r, how: `사슬 ${c - 1}코 + 기둥사슬 ${TC}, ${m[2]} · 첫 코에 빼뜨기`, why: r.why.replace(`사슬 ${c}코 기초`, `사슬 ${c - 1}코 기초`), turn: TC };
      }
      return { ...r, how: `기둥사슬 ${TC}, ${r.how}, 첫 코에 빼뜨기`, turn: TC };
    }
    if (r.part === "rounds") return { ...r, how: `기둥사슬 ${TC}, ${r.how}`, turn: TC };
    if ((r.part === "rows" || r.part === "flap") && r.how.startsWith("사슬 1, 뒤집어서")) return { ...r, how: r.how.replace("사슬 1, 뒤집어서", `기둥사슬 ${TC}, 뒤집어서`), turn: TC };
    // a rows piece: the base chain alone, then row 1 raised by its 기둥사슬
    // (the row keeps its own stitch and its own words: it read 짧은뜨기 whatever the stitch, and a painted row lost
    // its colours and holes here)
    if (r.part === "rows" && r.how.startsWith("두 번째 사슬부터")) { const rest = r.how.slice("두 번째 사슬부터 ".length); return { ...r, how: /^\S+( \S+)? \d+코$/.test(rest) ? `기둥사슬 ${TC}, 사슬 ${r.n}코에 ${rest}` : `기둥사슬 ${TC}, 첫 사슬부터 ${rest}`, turn: TC }; }
    // the base chain is the stitches of row 1: the plan's chain is that and ONE more whatever the stitch (it took
    // off the stitch's whole 기둥사슬 - 3 for 한길긴뜨기 - and came out 2 short)
    if (r.part === "start" && /^사슬 \d+코$/.test(r.how)) return { ...r, n: r.n - 1, how: `사슬 ${r.n - 1}코`, why: r.why.replace(/, 기둥 사슬 1코 더$/, "") };
    if (r.part === "start" && r.how.endsWith("고리 연결")) return r;
    return r;
  });
  return { ...pp, rows };
}
