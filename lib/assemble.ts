// 조립하기 (Kim: 조립식으로, 슬라이더로 자유롭게): a piece put together from parts - a bottom, a body, handles,
// a flap, what is sewn on - each part's sizes dragged. Everything here ends in the draft's own fields (a, b, h,
// topA, profile, handleCm...), so the pattern's counts and the 3D come from the same numbers as before.
import { ITEM, itemIdOf, type ItemId } from "./items";
import type { Draft } from "./types";
import type { ShapeSpec } from "./sketchShape";

/** the body between the bottom and the opening: the opening's width (cm), how far its sides swell (0 straight
 *  .. 1 a round belly) and how round that swelling is (0 a soft point .. 1 full, like a ball) */
export interface BodyForm { top: number; belly: number; round: number }

export function bodyOf(d: Draft): BodyForm {
  if (d.asm) return d.asm;
  return { top: d.topA ?? d.a, belly: 0, round: .6 };
}
/** the body's width at height t (0 the bottom .. 1 the opening), in cm */
export function bodyWidth(a: number, f: BodyForm, t: number): number {
  const line = a + (f.top - a) * t, p = 2 - 1.6 * f.round;
  return Math.max(a * .25, line + f.belly * .45 * Math.max(a, f.top) * Math.pow(Math.sin(Math.PI * t), p));
}
/** what the draft keeps for a body: straight sides need nothing, slanted ones the opening's width (topA), a
 *  swelling body its silhouette (profile: widths up the height, the bottom 1) */
export function bodyPatch(d: Draft, f: BodyForm): Partial<Draft> {
  const a = d.a, top = Math.round(f.top * 2) / 2;
  if (f.belly < .03) return { asm: f, profile: undefined, depthProfile: undefined, topA: Math.abs(top - a) < .5 ? null : top };
  const N = 8, prof = Array.from({ length: N + 1 }, (_, i) => Math.round(bodyWidth(a, f, i / N) / a * 1000) / 1000);
  return { asm: f, profile: prof, depthProfile: undefined, topA: null };
}

const r1 = (v: number) => Math.round(v * 2) / 2;
/** the whole piece larger or smaller by k, every part with it (inside the item's own sizes) */
export function scaleDraft(d: Draft, k: number): Partial<Draft> {
  const it = ITEM[itemIdOf(d)], lim = (key: "a" | "b" | "h", v: number) => { const r = it.range[key]; return r ? Math.min(r[1], Math.max(r[0], r1(v))) : r1(v); };
  const a = lim("a", d.a * k), kk = d.a ? a / d.a : k; // what the width could take is what everything takes
  const out: Partial<Draft> = { a, b: lim("b", d.b * kk), h: d.h ? lim("h", d.h * kk) : d.h };
  if (d.topA != null) out.topA = r1(d.topA * kk);
  if (d.asm) out.asm = { ...d.asm, top: r1(d.asm.top * kk) };
  if (d.handleCm) out.handleCm = Math.round(d.handleCm * kk);
  if (d.flapCm) out.flapCm = Math.max(3, Math.round(d.flapCm * kk));
  return out;
}

const SHAPE_KO = { circle: "원", oval: "타원", rect: "네모" } as const;
/** the parts a draft is made of, in the order they are worked: [part, what it is] */
export function partLines(d: Draft): [string, string][] {
  const it = ITEM[itemIdOf(d)], out: [string, string][] = [];
  if (it.kind === "base-body" && d.build) {
    // 구조 부품 (lib/structure): what the piece is put together from
    out.push(["판", `${d.a} × ${d.h}cm · ${d.build === "hobo1" && d.hoboFold ? "한 장으로 이어서" : "2장"}${(d.corner ?? 0) > .02 ? " · 둥근 모서리" : ""}`]);
    if (d.build === "panels") out.push(["띠", `너비 ${d.stripCm ?? 6}cm · 옆과 바닥${d.stripHandle && d.handle !== "none" ? ` · 손잡이 ${d.handleCm ?? 50}cm까지` : ""}`]);
    else out.push(["끈", `기둥 ${d.postSt ?? 5}코 · ${d.strapCm ?? 60}cm`]);
    if (d.build === "panels" && !d.stripHandle && d.handle !== "none") out.push(["손잡이", `끈 2개 · ${d.handleCm ?? 45}cm`]);
  } else if (it.kind === "base-body") {
    out.push(["바닥", d.shape === "circle" ? `원 지름 ${d.a}cm` : d.gusset === "flat" ? `${d.a}cm · 면과 면 잇기 (납작)` : `${SHAPE_KO[d.shape]} ${d.a} × ${d.b}cm`]);
    const f = bodyOf(d), top = d.profile ? Math.round(d.a * d.profile[d.profile.length - 1] / d.profile[0]) : d.topA ?? d.a;
    out.push(["몸통", `높이 ${d.h}cm · 입구 ${top}cm` + (d.profile ? " · 둥글게" : f.top > d.a + .4 ? " · 위로 넓게" : f.top < d.a - .4 ? " · 위로 좁게" : " · 일자")]);
    if (d.handle !== "none") out.push(["손잡이", d.handleKind === "wrist" ? `손목 고리 · ${d.handleCm ?? 25}cm` : d.handleKind === "grown" ? `이어 뜨기 · ${d.handleCm ?? 40}cm` : `${!d.handleStyle ? "끈" : d.handleStyle === "tube" ? "원통형" : "평면"} ${d.handleCount ?? 2}개 · ${d.handleCm ?? 25}cm`]);
    if (d.flapCm) out.push(["덮개", `${{ half: "반달", square: "네모", triangle: "세모" }[d.flapShape ?? "half"]} · ${d.flapCm}cm${d.flapOver === "top" ? " · 윗면 덮고 내려오기" : ""}`]);
    else if (d.closure === "drawstring") out.push(["입구", "끈으로 조이기"]);
  } else if (it.kind === "tube") out.push(["몸통", `둘레 ${d.a}cm · 높이 ${d.h}cm`]);
  else if (it.kind === "flat-rows") out.push(["편물", `${d.a} × ${d.b}cm`]);
  else out.push(["편물", d.shape === "circle" ? `원 지름 ${d.a}cm` : `${SHAPE_KO[d.shape]} ${d.a} × ${d.b}cm`]);
  const ex = d.extras ?? {};
  if (ex.button) out.push(["단추", ex.buttonAt ? `${ex.buttonAt[2].toFixed(1)}cm` : "1개"]);
  if (ex.zipper) out.push(["지퍼", "입구"]);
  if (ex.label) out.push(["라벨", ex.labelAt ? `${ex.labelAt[2].toFixed(1)}cm` : "1개"]);
  return out;
}

/** a name for a piece left unnamed (Kim: 비워 두면 결과물을 보고 자동으로): its colour, its look, what it is */
export function autoName(d: Draft): string {
  const it = ITEM[itemIdOf(d)], bits: string[] = [];
  if (d.colorName) bits.push(d.colorName);
  if (it.kind === "base-body") { if (d.profile) bits.push("둥근"); else if (d.flapCm) bits.push("덮개"); else if (d.closure === "drawstring") bits.push("복주머니"); }
  if (d.free || d.paint) return [...bits.slice(0, 1), "직접 그린 작품"].join(" ");
  return [...bits, it.name].join(" ");
}

/** what the reader typed, read without the AI (no key, no network): the item by its words, the usual parts */
const WORDS: [RegExp, ItemId][] = [[/파우치|필통|동전지갑|지갑/, "pouch"], [/버킷|복조리|복주머니/, "bucket"], [/가방|백|토트|숄더|크로스/, "minibag"], [/바구니|바스켓|수납/, "basket"], [/화분/, "planter"], [/연필|펜꽂이/, "pencil"], [/컵\s*홀더|텀블러/, "cupholder"],
  [/수세미/, "scrubber"], [/냄비\s*받침/, "trivet"], [/코스터|컵\s*받침/, "coaster"], [/테이블\s*매트|식탁\s*매트/, "placemat"], [/러그|발매트/, "rug"], [/목도리|머플러|스카프/, "scarf"], [/넥워머/, "neckwarmer"], [/헤어\s*밴드|머리띠/, "headband"],
  [/행주/, "dishcloth"], [/책갈피/, "bookmark"], [/담요|블랭킷/, "blanket"], [/비니|모자/, "beanie"]];
export function guessItem(text: string): ItemId | null { for (const [re, id] of WORDS) if (re.test(text)) return id; return null; }
export function guessSpec(text: string): ShapeSpec | null {
  const id = guessItem(text); if (!id) return null;
  const it = ITEM[id], dv = it.defaults, bag = it.kind === "base-body";
  const round = /둥근|둥글|동그|호보|반달/.test(text), flap = /덮개|뚜껑|플랩/.test(text);
  const handles = !it.handles || /손잡이\s*없/.test(text) ? 0 : /어깨|숄더|크로스|한\s*개|하나/.test(text) ? 1 : 2;
  return {
    kind: id === "pouch" ? "pouch" : id === "basket" ? "basket" : bag ? "bag" : "other", item: id,
    bottom: round && (it.shapes ?? []).includes("oval") ? "oval" : dv.shape ?? "rect",
    widthCm: dv.a, depthCm: dv.b ?? dv.a, heightCm: dv.h ?? 0, body: "straight",
    ...(round && bag ? { profile: [.62, .86, 1, 1, .92, .76, .56], rounded: true, widthCm: Math.round(dv.a * 1.5) } : {}),
    flap: flap && bag ? "half" : "none", handles: handles as 0 | 1 | 2, handleCm: handles === 1 ? (/크로스/.test(text) ? 120 : 70) : handles ? 45 : undefined,
    handleStyle: /넓적|납작|평면|띠/.test(text) ? "flat" : /원통|둥근\s*손잡이/.test(text) ? "tube" : undefined,
    button: /단추/.test(text), zipper: /지퍼/.test(text), label: /라벨/.test(text),
    summary: `${it.name}${round && bag ? "을 둥근 모양으로" : "의 기본 모양으로"} 준비했습니다.`,
  };
}
