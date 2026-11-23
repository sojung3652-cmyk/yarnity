// A pattern (draft / saved work + its plan) -> the yarn engine's input. Light: no three.js here, so the
// "3D로 보기" buttons and the book's page can decide what to draw without loading the engine.
// Every item 도안 만들기 makes is drawn, in the plan's own counts (lib/pattern.ts):
//   round bottom (+ body)     bottom / body / rim rounds           -> "round" (the bottom rounds lie flat)
//   oval / rect bottom (+ body) base chain `c`, bottom rounds, body -> "oval" / "rect" (worked around the chain)
//   back and forth            n stitches x the "rows" rows         -> "rows" (목도리: knitted, Kim)
//   tube                      n stitches x the "rounds" rounds     -> "tube"
// Not drawn: a bag's flap (덮개; the prototype has nothing for it).
import type { Plan, PlanInput } from "@/lib/pattern";
import { hookMmOf } from "@/lib/yarn";
import { isKnit } from "@/lib/knit";
import type { YarnMaterial, YarnPattern, YarnShape } from "./engine";

/** the pattern's own fields the engine reads (Draft and Project both have them) */
export interface YarnSource extends PlanInput {
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
  extras?: { button?: boolean; label?: boolean; zipper?: boolean } | null;
}

// no thickness typed (only thin / medium / thick picked): the middle of each level in lib/yarn.ts
// YARN_MM_LEVELS (thin < 2.5mm, thick > 4mm)
const LEVEL_MM: Record<string, number> = { thin: 2, medium: 3, thick: 5 };
// no colour picked yet: ivory (Kim: unpicked values are drawn as ivory cotton)
export const DEFAULT_COLOR = "#EFE6D4";
// the pattern's yarn material (lib/yarn.ts MATERIALS) -> the engine's look; anything else stays cotton
const MAT: Record<string, YarnMaterial> = {
  코튼: "cotton", 울: "wool", 메리노: "wool", 캐시미어: "cashmere", 아크릴: "wool", 알파카: "alpaca", 모헤어: "mohair", 앙고라: "angora",
  수면사: "sleep", 부클레: "boucle", 수세미실: "scrub", 패브릭얀: "tshirt", 리본얀: "ribbon", 황마: "jute",
  리넨: "linen", 실크: "silk", 대나무: "silk", 나일론: "silk", 폴리에스터: "silk", "벨벳(셔닐)": "chenille",
  라피아: "raffia", 코드사: "cord", 페이크퍼: "fur", 메탈릭: "metal",
};

export function yarn3dSupported(p: PlanInput): boolean {
  return ["coaster", "bag", "rows", "tube"].includes(p.object);
}

export function toYarnPattern(p: YarnSource, pp: Plan): YarnPattern | null {
  if (!yarn3dSupported(p) || !pp.rows.length) return null;
  const counts = (...parts: string[]) => pp.rows.filter(r => parts.includes(r.part)).map(r => Math.max(1, Math.round(r.n)));
  let shape: YarnShape;
  if (p.object === "rows") {
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
  const strap = p.object !== "bag" || !p.handle || p.handle === "none" ? "none" : handleCm >= 60 ? "long" : "two";
  // several materials picked: the one picked last is drawn (so pressing another one shows it at once)
  const material = [...(p.materials ?? [])].reverse().map(m => MAT[m]).find(Boolean) ?? "cotton";
  return { shape, colors: [color], yarnMm: p.yarnMm || LEVEL_MM[p.weight] || 3, hookMm: hookMmOf(p), strap, strapCm: handleCm, material,
    ...(p.fuzzK != null && p.fuzzK !== 1 ? { fuzzK: p.fuzzK } : {}), ...(p.hairK != null && p.hairK !== 1 ? { hairK: p.hairK } : {}),
    ...(p.handleW && p.handleW !== 3 ? { strapW: p.handleW } : {}), ...(p.extras && (p.extras.button || p.extras.label || p.extras.zipper) ? { extras: p.extras } : {}) };
}
