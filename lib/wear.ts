// 쓰는 것 (Kim: 실제 작품들에서 본 구조 원리로 모자·후드 기본형): pieces that go on a head -
//   버킷햇           a round crown increased until its round is the head's, a straight side, a brim that grows by
//                   the same share every round (and, when asked, is worked twice as long and folded in)
//   모티프 버킷햇     square motifs: one for the crown, a ring of them for the side, a ring a little bigger for the brim
//   후드 스카프       the crown's round, then rows back and forth over two thirds of it down to the neck, the few
//                   stitches at each end going on as the scarf
//   이어플랩 후드     a panel half the head round and as tall as the head, folded in half and joined along the
//                   top, the few stitches at each lower end going on down as the ear flaps
//   삼각 헤드스카프   a triangle grown from one point, a stitch (or a repeat) more at each end every row, a cord
//                   at each end of its long edge
// Only how each is put together is taken from made pieces. Every number is the gauge's (lib/pattern gauge) and
// the sizes typed: a round or a width over a stitch's width, a height or a length over a row's height. The 3D
// (src/features/yarn3d/worn), the words and the symbol chart all read these rows.
import type { Gauge, Plan, PlanInput, Row } from "./pattern";
import { knitFold, knitTop } from "./knitwear";
import type { Draft } from "./types";

const rnd = (x: number) => Math.round(+x.toFixed(6));
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const SC = "짧은뜨기", DC = "한길긴뜨기";
const mm = (v: number) => fmt(v * 10);
const pos = (v: number | null | undefined, d: number) => (v != null && v > 0 ? v : d);

export type WearId = "buckethat" | "motifhat" | "hoodscarf" | "earflap" | "kerchief" | "trapbag" | "moonbag" | "bonnet" | "bustier" | "halter"
  | "knotbag" | "twoway" | "balaclava" | "motifscarf" | "bigsocks" | "knitfold" | "knittop";
/** the pieces counted here: each is put together its own way, and drawn in the 3D as it is worn or carried */
export const WEAR_IDS: WearId[] = ["knitfold", "knittop", "buckethat", "motifhat", "hoodscarf", "earflap", "kerchief", "trapbag", "moonbag", "bonnet", "bustier", "halter", "knotbag", "twoway", "balaclava", "motifscarf", "bigsocks"];
export const isWear = (item?: string | null): item is WearId => !!item && (WEAR_IDS as string[]).includes(item);
/** the sizes each starts from (cm): the head's round, its height, a brim, a cord or a flap */
export const WEAR_DEFAULT = { circ: 56, side: 8, brim: 6, headH: 24, hoodH: 28, tie: { hoodscarf: 60, earflap: 30, kerchief: 25 } as Record<string, number>, tieW: 8, motifN: 8, brimMore: 1, rib: 3 };
/** a brim grows by this share of the round before, every round */
export const BRIM_RATE = 1 / 20;
/** a hood's rows stand on this share of the crown's round (the rest is left open for the face) */
export const HOOD_SHARE = 2 / 3;
/** a head scarf's long edge against the head's round */
export const KERCHIEF_SHARE = .9;

type Bottom = (p: PlanInput, g: Gauge) => { rows: Omit<Row, "idx" | "label">[] };
const number = (rows: Row[]) => { rows.forEach((r, i) => { r.idx = i; }); return rows; };

// ---------------------------------------------------------------- 버킷햇
/** crown rounds R: six stitches more a round until the round is the head's (6 R x a stitch's width);
 *  side rounds = its height / a row's height; brim rounds = its width / a row's height, each a twentieth more
 *  than the one before. `fold`: the brim worked back in again (the same counts, backwards) and joined inside. */
export function bucketHat(p: PlanInput, g: Gauge) {
  const circ = pos(p.circ, WEAR_DEFAULT.circ), side = pos(p.h, WEAR_DEFAULT.side), brim = p.brimCm != null && p.brimCm >= 0 ? p.brimCm : WEAR_DEFAULT.brim;
  const R = Math.max(3, rnd(circ / (6 * g.w))), N = 6 * R, S = Math.max(2, rnd(side / g.h)), B = brim >= g.h / 2 ? Math.max(1, rnd(brim / g.h)) : 0;
  const counts: number[] = []; let n = N;
  for (let i = 0; i < B; i++) { n += Math.max(1, Math.round(n * BRIM_RATE)); counts.push(n); }
  const fold = !!p.brimFold && B > 0, inner = fold ? [counts[B - 1], ...counts.slice(0, B - 1).reverse()] : [];
  return { circ, side, brim, R, N, S, B, counts, fold, inner };
}
export function planBucketHat(p: PlanInput, g: Gauge, bottom: Bottom): Plan {
  const H = bucketHat(p, g), { R, N, S, B } = H, rows: Row[] = [];
  bottom({ ...p, shape: "circle", a: 2 * R * g.h, gusset: null }, g).rows.forEach((r, i) => rows.push({ ...r, no: i + 1, label: `${i + 1}단`,
    why: i === 0 ? `시작 · 머리둘레 ${H.circ}cm ÷ (코 너비 ${mm(g.w)}mm × 6코) = ${R}단 동안 늘립니다` : i === R - 1 ? `${r.why} · 한 바퀴 ${N}코 × ${mm(g.w)}mm = ${fmt(N * g.w)}cm, 머리둘레에 닿았습니다` : r.why } as Row));
  for (let i = 0; i < S; i++) rows.push({ part: "body", n: N, inc: 0, label: `${R + i + 1}단`, how: `늘림 없이 ${SC} ${N}코`,
    why: i === 0 ? `여기서부터 늘리지 않고 내려 뜹니다 · 옆 높이 ${fmt(H.side)}cm ÷ 코 높이 ${mm(g.h)}mm = ${S}단` : `${N}코 그대로` } as Row);
  let prev = N, k = R + S;
  H.counts.forEach((n, i) => { rows.push({ part: "rim", n, inc: n - prev, label: `${++k}단`, how: `${SC} ${n}코 (늘림 ${n - prev}코를 고르게 나눠서)`,
    why: (i === 0 ? `챙 너비 ${fmt(H.brim)}cm ÷ 코 높이 ${mm(g.h)}mm = ${B}단 · 단마다 앞 단 코 수의 ${Math.round(BRIM_RATE * 100)}%씩 늘립니다 · ` : "") + `${prev} + 늘림 ${n - prev} = ${n}` } as Row); prev = n; });
  H.inner.forEach((n, i) => { rows.push({ part: "rim", n, inc: n - prev, label: `${++k}단`,
    how: i === 0 ? `뒷고리에만 ${SC} ${n}코` : `${SC} ${n}코 (줄임 ${prev - n}번을 고르게 나눠서)`,
    why: i === 0 ? `접는 선입니다 · 여기서부터 안쪽 겹을 같은 단 수(${B}단)만큼 되돌아 뜹니다` : `${prev} - 줄임 ${prev - n} = ${n} · 바깥 겹과 같은 코 수로 되돌아갑니다` } as Row); prev = n; });
  if (H.fold) rows.push({ part: "join", n: 0, inc: 0, own: true, label: "챙 잇기", how: `챙을 접는 선에서 안으로 접어, 마지막 단 ${prev}코를 챙 첫 단 안쪽에 감침질로 잇습니다`, why: `두 겹 챙 · 안쪽 겹 ${prev}코가 바깥 겹 첫 단 ${H.counts[0]}코와 맞닿습니다` } as Row);
  return { g, c: 0, rows: number(rows), bottomRounds: R, bodyRows: S, last: N };
}

// ---------------------------------------------------------------- 모티프 버킷햇
/** A square motif worked round from a ring: round r has 8 r stitches, a side 2 r of them. With `n` motifs round
 *  the head, a motif's rounds R = the head's round / n / (2 x a stitch's width). The crown is the same motif
 *  worked on until its round is the ring's (n x 2 R stitches: Rc = n R / 4 rounds); a brim motif is `more`
 *  rounds bigger, so its ring is wider than the side's and stands out from it. */
export function motifHat(p: PlanInput, g: Gauge) {
  const circ = pos(p.circ, WEAR_DEFAULT.circ), n = clamp(Math.round(p.motifN ?? WEAR_DEFAULT.motifN) || WEAR_DEFAULT.motifN, 4, 12), more = clamp(Math.round(p.brimMore ?? WEAR_DEFAULT.brimMore), 0, 4);
  const R = Math.max(2, rnd(circ / n / (2 * g.w))), E = 2 * R, ring = n * E, Rc = Math.max(R, rnd(ring / 8)), Rb = R + more, Eb = 2 * Rb;
  return { circ, n, more, R, E, ring, Rc, Rb, Eb, roundCm: ring * g.w, sizeCm: E * g.w, brimCm: Eb * g.h };
}
function motifRounds(name: string, rounds: number, first: string, rows: Row[]) {
  for (let r = 1; r <= rounds; r++) rows.push({ part: "panel", n: 8 * r, inc: r === 1 ? 0 : 8, own: true, label: `${name} ${r}단`, motif: { name, r },
    how: r === 1 ? `매직링에 기둥사슬 1, ${SC} 8코, 첫 코에 빼뜨기` : `기둥사슬 1, (모서리 코에 ${SC} 3코, 다음 모서리 전까지 ${SC} ${2 * r - 3}코) × 4, 첫 코에 빼뜨기`,
    why: r === 1 ? first : r === 2 ? "8 + 늘림 8 = 16 · 1단의 한 코 건너 한 코가 모서리입니다" : `${8 * (r - 1)} + 늘림 8 = ${8 * r} · 모서리 코는 아랫단 3코의 가운데 코입니다` } as Row);
}
export function planMotifHat(p: PlanInput, g: Gauge): Plan {
  const M = motifHat(p, g), { n, R, E, ring, Rc, Rb, Eb } = M, rows: Row[] = [];
  const join = (label: string, cnt: number, how: string, why: string) => rows.push({ part: "join", n: cnt, inc: 0, own: true, label, how, why } as Row);
  for (let k = 1; k <= n; k++) motifRounds(`옆 모티프 ${k}`, R, k === 1 ? `머리둘레 ${M.circ}cm ÷ ${n}장 ÷ (코 너비 ${mm(g.w)}mm × 2) = ${R}단 · 한 변 ${E}코 = ${fmt(M.sizeCm)}cm · 같은 모티프를 ${n}장 뜹니다` : `옆 모티프 1과 같습니다 (${k}/${n}장)`, rows);
  join("옆 잇기 준비", 0, `옆 모티프 ${n}장을 한 줄로 늘어놓고, 맞닿는 변끼리 마커링으로 모서리를 맞춥니다`, "잇는 순서: 옆 → 정수리 → 챙 → 챙 달기");
  join("옆 잇기", ring, `이웃한 두 모티프의 변을 겉이 밖으로 오게 맞대고 두 겹을 함께 떠서 ${SC} ${E}코로 잇습니다. ${n}군데를 이어 고리로 만듭니다 (모두 ${ring}코)`,
    `한 변 ${E}코 × ${n}군데 = ${ring}코 · 고리 둘레 ${ring}코 × ${mm(g.w)}mm = ${fmt(M.roundCm)}cm (머리둘레 ${M.circ}cm)`);
  motifRounds("정수리 모티프", Rc, `옆 고리 ${ring}코 ÷ 8 = ${Rc}단 · 같은 모티프를 ${Rc}단까지 떠서 한 바퀴가 옆 고리와 맞게 합니다`, rows);
  join("정수리 잇기", ring, `정수리 모티프의 네 변에 옆 고리의 윗변을 두 겹을 함께 떠서 ${SC} ${ring}코로 잇습니다 (정수리 한 변에 옆 모티프 ${fmt(n / 4, 2)}장씩)`,
    `정수리 한 바퀴 ${8 * Rc}코 · 옆 고리 ${ring}코` + (8 * Rc !== ring ? " · 코 수가 다른 만큼 모서리에서 고르게 맞춥니다" : ""));
  for (let k = 1; k <= n; k++) motifRounds(`챙 모티프 ${k}`, Rb, k === 1 ? `옆 모티프 ${R}단${M.more ? ` + ${M.more}단 = ${Rb}단` : " 그대로"} · 한 변 ${Eb}코 = ${fmt(Eb * g.w)}cm · ${n}장 뜹니다` : `챙 모티프 1과 같습니다 (${k}/${n}장)`, rows);
  join("챙 잇기", n * Eb, `챙 모티프 ${n}장을 같은 방법으로 두 겹을 함께 떠서 ${SC} ${Eb}코씩 이어 고리로 만듭니다 (모두 ${n * Eb}코)`, `한 변 ${Eb}코 × ${n}군데 = ${n * Eb}코 · 챙 고리 둘레 ${fmt(n * Eb * g.w)}cm`);
  join("챙 달기", ring, `챙 고리의 윗변을 옆 고리의 아랫변에 두 겹을 함께 떠서 ${SC} ${ring}코로 잇습니다` + (M.more ? ` (챙 쪽 ${n * Eb}코를 고르게 오므려 가며)` : ""),
    `옆 고리 ${ring}코` + (M.more ? ` · 챙 고리가 ${n * (Eb - E)}코 더 넓어 아래로 벌어집니다` : " · 챙 고리와 같은 코 수입니다"));
  return { g, c: 1, rows: number(rows), bottomRounds: 0, bodyRows: E, last: ring };
}

// ---------------------------------------------------------------- 후드 스카프
/** The crown's round as a hat's (6 R stitches, the head's round); then rows back and forth on two thirds of it,
 *  down to the neck: rows = (the head's height - the crown's radius) / a row's height. The `T` stitches at each
 *  end of the last row go on alone as the scarf: T = its width / a stitch's width, rows = its length / a row's. */
export function hoodScarf(p: PlanInput, g: Gauge) {
  const circ = pos(p.circ, WEAR_DEFAULT.circ), hh = pos(p.headH, WEAR_DEFAULT.hoodH), tw = pos(p.tieWcm, WEAR_DEFAULT.tieW), tl = pos(p.tieCm, WEAR_DEFAULT.tie.hoodscarf);
  const R = Math.max(3, rnd(circ / (6 * g.w))), N = 6 * R, W = Math.max(6, rnd(N * HOOD_SHARE)), H = Math.max(2, rnd((hh - R * g.h) / g.h));
  const T = clamp(rnd(tw / g.w), 2, Math.max(2, Math.floor(W / 2) - 1)), PR = Math.max(2, rnd(tl / g.h));
  return { circ, hh, tw, tl, R, N, W, open: N - W, H, T, PR };
}
const posts = (name: string, what: string, W: number, T: number, PR: number, g: Gauge, first: string, last: string, rows: Row[]) => {
  for (const q of [0, 1] as const) for (let i = 0; i < PR; i++) rows.push({ part: "strap", n: T, inc: 0, own: true, post: q, edge: [0, 0], label: `${name} ${what}${q + 1} ${i + 1}단`,
    how: (i === 0 ? (q === 0 ? `기둥사슬 1, 뒤집어서 끝의 ${T}코에만 ${SC} ${T}코 (가운데 ${W - 2 * T}코는 뜨지 않고 남깁니다)` : `반대쪽 끝 ${T}코에 새 실을 걸어 기둥사슬 1, ${SC} ${T}코`) : `기둥사슬 1, 뒤집어서 ${SC} ${T}코`) + (i === PR - 1 ? ` · ${last}` : ""),
    why: i === 0 && q === 0 ? first : `${T}코 그대로` } as Row);
};
export function planHoodScarf(p: PlanInput, g: Gauge, bottom: Bottom): Plan {
  const H = hoodScarf(p, g), { R, N, W } = H, rows: Row[] = [];
  bottom({ ...p, shape: "circle", a: 2 * R * g.h, gusset: null }, g).rows.forEach((r, i) => rows.push({ ...r, no: i + 1, label: `${i + 1}단`,
    why: i === 0 ? `시작 · 머리둘레 ${H.circ}cm ÷ (코 너비 ${mm(g.w)}mm × 6코) = ${R}단 동안 원형으로 늘립니다` : i === R - 1 ? `${r.why} · 원형은 여기까지입니다` : r.why } as Row));
  for (let i = 0; i < H.H; i++) rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: `후드 ${i + 1}단`,
    how: i === 0 ? `기둥사슬 1, ${SC} ${W}코 (남은 ${H.open}코는 얼굴 자리로 비워 둡니다)` : `기둥사슬 1, 뒤집어서 ${SC} ${W}코`,
    why: i === 0 ? `여기서부터 왕복으로 뜹니다 · 정수리 ${N}코의 2/3 = ${W}코 · (머리 높이 ${fmt(H.hh)}cm − 정수리 반지름 ${fmt(R * g.h)}cm) ÷ 코 높이 ${mm(g.h)}mm = ${H.H}단` : `${W}코 그대로` } as Row);
  posts("후드", "끈", W, H.T, H.PR, g, `끈 너비 ${fmt(H.tw)}cm ÷ 코 너비 ${mm(g.w)}mm = ${H.T}코 · 끈 길이 ${fmt(H.tl)}cm ÷ 코 높이 ${mm(g.h)}mm = ${H.PR}단씩`, "실을 자르고 정리합니다", rows);
  return { g, c: 0, rows: number(rows), bottomRounds: R, bodyRows: H.H, last: W };
}

// ---------------------------------------------------------------- 이어플랩 후드
/** A panel half the head's round wide (an even count, to fold) and the head's height tall, worked down from the
 *  chain that becomes the top seam; the `T` stitches at each end go on down as the ear flaps; folded in half,
 *  the chain's two halves are joined (half its stitches). `rib`: rows along the face edge (the panel's two side
 *  edges: twice the height / a stitch's width, even) - one of 한길긴뜨기, then front and back post stitches. */
export function earflap(p: PlanInput, g: Gauge) {
  const circ = pos(p.circ, WEAR_DEFAULT.circ), hh = pos(p.headH, WEAR_DEFAULT.headH), fw = pos(p.tieWcm, WEAR_DEFAULT.tieW), fl = pos(p.tieCm, WEAR_DEFAULT.tie.earflap);
  let W = Math.max(8, rnd(circ / 2 / g.w)); if (W % 2) W++;
  const R = Math.max(3, rnd(hh / g.h)), T = clamp(rnd(fw / g.w), 2, W / 2 - 1), PR = Math.max(2, rnd(fl / g.h));
  let F = Math.max(4, rnd(2 * R * g.h / g.w)); if (F % 2) F++;
  const rib = clamp(Math.round(p.ribRows ?? WEAR_DEFAULT.rib), 0, 8);
  return { circ, hh, fw, fl, W, R, T, PR, J: W / 2, F, rib: rib >= 2 ? rib : 0 };
}
export function planEarflap(p: PlanInput, g: Gauge): Plan {
  const H = earflap(p, g), { W, R, F } = H, rows: Row[] = [];
  rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: "후드 시작 사슬", how: `사슬 ${W}코`, why: `머리둘레 ${H.circ}cm의 절반 ÷ 코 너비 ${mm(g.w)}mm = ${W}코 (반 접도록 짝수) · 이 사슬이 정수리 선입니다` } as Row);
  for (let i = 0; i < R; i++) rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: `후드 ${i + 1}단`,
    how: i === 0 ? `기둥사슬 1, 사슬 ${W}코에 ${SC} ${W}코` : `기둥사슬 1, 뒤집어서 ${SC} ${W}코`,
    why: i === 0 ? `머리 높이 ${fmt(H.hh)}cm ÷ 코 높이 ${mm(g.h)}mm = ${R}단을 아래로 내려 뜹니다` : `${W}코 그대로` } as Row);
  posts("후드", "귀덮개", W, H.T, H.PR, g, `귀덮개 너비 ${fmt(H.fw)}cm ÷ 코 너비 ${mm(g.w)}mm = ${H.T}코 · 길이 ${fmt(H.fl)}cm ÷ 코 높이 ${mm(g.h)}mm = ${H.PR}단씩`, "실을 자르고 정리합니다", rows);
  rows.push({ part: "join", n: 0, inc: 0, own: true, label: "잇기 준비", how: "판을 세로로 반 접어 시작 사슬의 양 끝을 맞댑니다. 접힌 선이 뒤통수 가운데로 갑니다", why: "귀덮개 두 개가 아래 양쪽에 오게 합니다" } as Row);
  rows.push({ part: "join", n: H.J, inc: 0, own: true, label: "정수리 잇기", how: `시작 사슬 쪽 두 겹을 함께 떠서 ${SC} ${H.J}코로 잇습니다`, why: `시작 사슬 ${W}코의 절반 = ${H.J}코` } as Row);
  for (let i = 0; i < H.rib; i++) rows.push({ part: "rim", n: F, inc: 0, own: true, hk: 2.05, rib: i === 0 ? "base" : i % 2 ? "fb" : "bf", label: `앞선 ${i + 1}단`,
    how: i === 0 ? `얼굴선(판 양옆의 단 끝)을 따라 새 실을 걸어 사슬 2, ${DC} ${F}코` : `사슬 2, 뒤집어서 (${i % 2 ? "앞걸어" : "뒤걸어"} ${DC} 1, ${i % 2 ? "뒤걸어" : "앞걸어"} ${DC} 1) × ${F / 2}`,
    why: i === 0 ? `얼굴선 = 머리 높이 ${fmt(H.hh)}cm × 2 ÷ 코 너비 ${mm(g.w)}mm = ${F}코 (짝수)` : `${F}코 그대로 · 앞걸어와 뒤걸어를 번갈아 세로 골을 만듭니다` } as Row);
  return { g, c: W, rows: number(rows), bottomRounds: 0, bodyRows: R, last: W };
}

// ---------------------------------------------------------------- 삼각 헤드스카프
export type KerchiefKind = "sc" | "net" | "vst";
/** the pattern a head scarf is worked in: 짧은뜨기, 그물 (chain arches) or 레이스 (V stitches) */
export const kerchiefKind = (p: Pick<PlanInput, "crochetChart">): KerchiefKind => (p.crochetChart === "net" ? "net" : p.crochetChart === "vst" ? "vst" : "sc");
/** A triangle from its point: every row one unit more at each end's worth - 짧은뜨기 two stitches a row (one at
 *  each end), 그물 one arch a row (4 stitches' width), 레이스 one V a row (3 stitches' width). It is done when its
 *  last row is the long edge: the head's round x 0.9 / a stitch's width. Rows are `ht` single-crochet rows tall.
 *  A cord at each end of the long edge: its length / a chain's length (0.85 x a stitch's width). */
export function kerchief(p: PlanInput, g0: Gauge, g: Gauge) {
  const circ = pos(p.circ, WEAR_DEFAULT.circ), long = circ * KERCHIEF_SHARE, kind = kerchiefKind(p), tie = pos(p.tieCm, WEAR_DEFAULT.tie.kerchief);
  const unit = kind === "net" ? 4 : kind === "vst" ? 3 : 2, ht = kind === "net" ? 1.45 : kind === "vst" ? 2.05 : 1;
  const want = Math.max(unit + 1, rnd(long / g0.w));
  // 짧은뜨기: 3 stitches, then 2 more a row; the patterns: one unit, then one more a row
  const R = kind === "sc" ? Math.max(2, Math.round((want - 3) / 2) + 1) : Math.max(2, Math.round(want / unit));
  const counts = Array.from({ length: R }, (_, i) => (kind === "sc" ? 3 + 2 * i : unit * (i + 1)));
  return { circ, long, kind, tie, unit, ht, R, counts, W: counts[R - 1], C: Math.max(4, rnd(tie / (g0.w * .85))), heightCm: R * ht * g.h };
}
export function planKerchief(p: PlanInput, g: Gauge, g0: Gauge): Plan {
  const K = kerchief(p, g0, g), { kind, R, counts, C } = K, rows: Row[] = [];
  const size = `긴 변 = 머리둘레 ${K.circ}cm × ${KERCHIEF_SHARE} = ${fmt(K.long)}cm ÷ 코 너비 ${mm(g0.w)}mm`;
  rows.push({ part: "start", n: 2, inc: 0, label: "시작 사슬", how: "사슬 2코", why: "꼭짓점에서 시작합니다, 기둥 사슬 1코 더" } as Row);
  for (let i = 0; i < R; i++) {
    const n = counts[i], k = i + 1, prev = i ? counts[i - 1] : 0, u = K.unit / 2;
    const how = kind === "sc"
      ? (i === 0 ? `기둥사슬 1, 시작 사슬 한 코에 ${SC} 3코` : `기둥사슬 1, 뒤집어서 첫 코에 ${SC} 2코, ${SC} ${prev - 2}코, 마지막 코에 ${SC} 2코`)
      : kind === "net"
        ? (i === 0 ? `기둥사슬 1, 시작 사슬에 ${SC} 1, 사슬 5, 같은 코에 ${SC} 1` : `기둥사슬 1, 뒤집어서 사슬 5, 첫 아치에 ${SC} 1, (사슬 5, 다음 아치에 ${SC} 1) × ${k - 2}, 사슬 5, 같은 아치에 ${SC} 1`.replace(" (사슬 5, 다음 아치에 짧은뜨기 1) × 0,", ""))
        : (i === 0 ? `사슬 4(${DC} 1 + 사슬 1), 시작 사슬에 ${DC} 1` : `사슬 4(${DC} 1 + 사슬 1), 뒤집어서 첫 코에 ${DC} 1, (V의 사슬 사이에 ${DC} 1 · 사슬 1 · ${DC} 1) × ${k - 1}`);
    const why = kind === "sc"
      ? (i === 0 ? `${size} = ${K.W}코가 될 때까지 · 단마다 양 끝에서 1코씩 늘려 ${R}단` : `${prev} + 늘림 2 = ${n} · 양 끝에서 1코씩`)
      : kind === "net"
        ? (i === 0 ? `${size} ÷ 아치 하나 4코 = 아치 ${R}개가 될 때까지 · 단마다 아치 하나씩 늘려 ${R}단` : `아치 ${k - 1} + 1 = ${k}개 · 마지막 아치에 두 번 떠서 하나를 늘립니다`)
        : (i === 0 ? `${size} ÷ V 하나 3코 = V ${R}개가 될 때까지 · 단마다 V 하나씩 늘려 ${R}단` : `V ${k - 1} + 1 = ${k}개 · 단 처음의 사슬 4와 한길긴뜨기가 새 V입니다`);
    rows.push({ part: "rows", n, inc: i ? n - prev : 0, own: true, no: k, label: `${k}단`, how, why, edge: i ? [u, u] : [0, 0], ...(kind !== "sc" ? { hk: K.ht, lace: { k: kind, i, reps: k } } : {}) } as Row);
  }
  for (const q of [0, 1]) rows.push({ part: "handle", n: C, inc: 0, own: true, label: `묶는 끈 ${q + 1}`,
    how: q === 0 ? `마지막 단 끝에서 이어 사슬 ${C}코 (약 ${fmt(K.tie)}cm), 빼뜨기로 되돌아옵니다` : `긴 변의 반대쪽 끝에 새 실을 걸어 사슬 ${C}코 (약 ${fmt(K.tie)}cm), 빼뜨기로 되돌아옵니다`,
    why: `끈 ${fmt(K.tie)}cm ÷ 사슬 한 코 ${mm(g0.w * .85)}mm = ${C}코` } as Row);
  return { g, c: 2, rows: number(rows), bottomRounds: 0, bodyRows: R, last: K.W };
}

// ================================================================ 작은 가방 · 보닛 · 옷 (Kim: 실제 작품들에서 본 구조 원리)
//   사다리꼴 주머니백   two panels that widen evenly at both ends from the narrow edge; the narrow edges joined
//                      (the bottom gathers), the sides joined, a band grown from one side of the opening to the other
//   반달 미니백         two circles; only their lower halves joined; a slot left in a round of each for the hand
//   보닛               a crown's round, rows back and forth on three quarters of it down the back of the head,
//                      a cord at each lower end
//   모티프 뷔스티에     square motifs sized by the gauge in a band round the chest, a triangle cup on it for each
//                      side, a cord from each cup's tip
//   그물 홀터 탑        a net worked round the chest and up, then the front alone back and forth, an arch fewer a
//                      row, to a point; a cord each side from the point
// (계단 덮개 미니백 and 폰 크로스백 are the bag engine's own - lib/pattern: a flap that steps in, an edging round.)

/** the chest's round a fitted top is made to (the fabric gives: a little under the chest's own) */
export const BUST_EASE = .92;
/** a phone's bag from the phone's own sizes: 1cm of ease each way. These are the bag's a and h. */
export const PHONE_EASE = 1;
export const phoneDims = (w: number, h: number): { a: number; h: number } => ({ a: Math.round((w + PHONE_EASE) * 2) / 2, h: Math.round((h + PHONE_EASE) * 2) / 2 });

const panelRow = (name: string, i: number, n: number, prev: number, why: string): Row => {
  const d = i ? (n - prev) / 2 : 0;
  return { part: "panel", n, inc: 2 * d, own: true, edge: [d, d], label: `${name} ${i + 1}단`,
    how: i === 0 ? `기둥사슬 1, 사슬 ${n}코에 ${SC} ${n}코` : d > 0 ? `기둥사슬 1, 뒤집어서 첫 코에 ${SC} ${d + 1}코, ${SC} ${prev - 2}코, 마지막 코에 ${SC} ${d + 1}코` : `기둥사슬 1, 뒤집어서 ${SC} ${n}코`,
    why: why || (d > 0 ? `${prev} + 늘림 ${2 * d} = ${n} · 양 끝에서 ${d}코씩` : `${n}코 그대로`) } as Row;
};
/** a cord: a chain, and back along it in slip stitches */
const cord = (label: string, C: number, cm: number, from: string, g: Gauge): Row => ({ part: "handle", n: C, inc: 0, own: true, label,
  how: `${from} 사슬 ${C}코 (약 ${fmt(cm)}cm), 빼뜨기로 되돌아옵니다`, why: `끈 ${fmt(cm)}cm ÷ 사슬 한 코 ${mm(g.w * .85)}mm = ${C}코` } as Row);

// ---------------------------------------------------------------- 사다리꼴 주머니백
/** a = the narrow edge, topA = the wide one, h = the height (cm). Rows = h / a row's height; what each end gains
 *  in all, (wide - narrow) / 2 stitches, is spread evenly over the rows. A side seam is the slant's length / a
 *  stitch's width. The band: its width / a stitch's width, its length / a row's height. */
export function trapBag(p: PlanInput, g: Gauge) {
  const a = pos(p.a, 12), top = Math.max(a, pos(p.topA, 26)), h = pos(p.h, 20), hw = pos(p.handleWcm, 4), hl = pos(p.handleCm, 40);
  const n0 = Math.max(4, rnd(a / g.w)); let W = Math.max(n0, rnd(top / g.w)); if ((W - n0) % 2) W++;
  const R = Math.max(3, rnd(h / g.h)), e = (W - n0) / 2, counts = Array.from({ length: R }, (_, i) => n0 + 2 * Math.round(e * i / (R - 1)));
  const slant = Math.hypot(h, (top - a) / 2), sideJ = Math.max(2, rnd(slant / g.w)), T = clamp(rnd(hw / g.w), 2, Math.max(2, Math.floor(W / 2))), HR = Math.max(2, rnd(hl / g.h));
  return { a, top, h, hw, hl, n0, W, R, e, counts, slant, sideJ, T, HR };
}
export function planTrapBag(p: PlanInput, g: Gauge): Plan {
  const B = trapBag(p, g), { n0, W, R, counts, sideJ, T, HR } = B, rows: Row[] = [];
  for (const name of ["앞판", "뒤판"]) {
    rows.push({ part: "panel", n: n0, inc: 0, own: true, edge: [0, 0], label: `${name} 시작 사슬`, how: `사슬 ${n0}코`, why: `좁은 쪽 ${fmt(B.a)}cm ÷ 코 너비 ${mm(g.w)}mm = ${n0}코 · 여기가 바닥 쪽입니다` } as Row);
    counts.forEach((n, i) => rows.push(panelRow(name, i, n, i ? counts[i - 1] : n, i === 0 ? `높이 ${fmt(B.h)}cm ÷ 코 높이 ${mm(g.h)}mm = ${R}단 · 넓은 쪽 ${fmt(B.top)}cm = ${W}코까지 양 끝에서 ${B.e}코씩, ${R - 1}단에 고르게 늘립니다` : "")));
  }
  rows.push({ part: "join", n: 0, inc: 0, own: true, label: "잇기 준비", how: "잇기 전에 마커링으로 두 판의 좁은 쪽(바닥)과 양 옆선 위치를 먼저 맞춥니다", why: "좁은 쪽끼리 이으면 바닥이 모이고, 넓은 쪽이 입구가 됩니다" } as Row);
  rows.push({ part: "join", n: n0, inc: 0, own: true, label: "바닥 잇기", how: `두 판의 시작 사슬(좁은 쪽)끼리 겉이 밖으로 오게 맞대고 되돌아짧은뜨기 ${n0}코로 잇습니다`, why: `시작 사슬 ${n0}코` } as Row);
  rows.push({ part: "join", n: 2 * sideJ, inc: 0, own: true, label: "옆선 잇기", how: `양 옆선을 각각 되돌아짧은뜨기 ${sideJ}코씩 잇습니다 (모두 ${2 * sideJ}코)`, why: `옆선(사선) ${fmt(B.slant)}cm ÷ 코 너비 ${mm(g.w)}mm = ${sideJ}코, 양쪽` } as Row);
  for (let i = 0; i < HR; i++) rows.push({ part: "handle", n: T, inc: 0, own: true, grown: { k: i === 0 ? "pick" : "even", side: 0, st: "sc" }, label: `손잡이 끈 ${i + 1}단`,
    how: i === 0 ? `입구 한쪽 옆선을 가운데로 ${T}코에 새 실을 걸어 사슬 1, ${SC} ${T}코` : `사슬 1, 뒤집어서 ${SC} ${T}코` + (i === HR - 1 ? ` · 실을 길게 남기고 잘라 반대쪽 옆선의 같은 ${T}코에 맞대고 감침질로 잇습니다` : ""),
    why: i === 0 ? `띠 너비 ${fmt(B.hw)}cm ÷ 코 너비 ${mm(g.w)}mm = ${T}코 · 길이 ${fmt(B.hl)}cm ÷ 코 높이 ${mm(g.h)}mm = ${HR}단 · 입구에서 그대로 이어 뜹니다` : `${T}코 그대로` } as Row);
  return { g, c: n0, rows: number(rows), bottomRounds: 0, bodyRows: R, last: W };
}

// ---------------------------------------------------------------- 반달 미니백
/** a = the circles' diameter: rounds R = a / 2 / a row's height, six stitches more a round. The hand's slot is in
 *  round `rh` (about two thirds out): `hs` stitches of the round below are skipped under as many chains
 *  (its width / a stitch's width). The lower halves are joined: half the last round's stitches. */
export function moonBag(p: PlanInput, g: Gauge) {
  const a = pos(p.a, 20), hw = p.holeW != null && p.holeW >= 0 ? p.holeW : 8;
  const R = Math.max(5, rnd(a / 2 / g.h)), rh = clamp(Math.round(R * .65), 4, R - 1), hs = hw >= 1 ? clamp(rnd(hw / g.w), 3, 6 * (rh - 1) - 8) : 0, N = 6 * R;
  return { a, hw, R, rh, hs, N, J: N / 2 };
}
export function planMoonBag(p: PlanInput, g: Gauge): Plan {
  const M = moonBag(p, g), { R, rh, hs, N } = M, rows: Row[] = [];
  for (const name of ["앞판", "뒤판"]) for (let r = 1; r <= R; r++) {
    const n = 6 * r, prev = n - 6, hole = r === rh && hs > 0, k = Math.floor((r - 2) / 2);
    const how = r === 1 ? `매직링에 기둥사슬 1, ${SC} 6코, 첫 코에 빼뜨기`
      : hole ? `기둥사슬 1, ${SC} 2코, 사슬 ${hs}코를 띄우고 ${hs}코 건너뛰기, 남은 ${prev - hs - 2}코에 ${SC} ${n - hs - 2}코 (늘림 6코를 고르게 나눠서), 첫 코에 빼뜨기`
      : r === 2 ? "기둥사슬 1, 모든 코에 늘림, 첫 코에 빼뜨기"
      : r % 2 === 0 || r < 4 ? `기둥사슬 1, (${SC} ${r - 2}, 늘림 1) × 6, 첫 코에 빼뜨기`
      : `기둥사슬 1, ${SC} ${k}, (늘림 1, ${SC} ${r - 2}) × 5, 늘림 1, ${SC} ${r - 2 - k}, 첫 코에 빼뜨기`;
    rows.push({ part: "panel", n, inc: r === 1 ? 0 : 6, own: true, label: `${name} ${r}단`, disc: { name, r, ...(hole ? { hole: hs } : {}) }, how,
      why: r === 1 ? `지름 ${fmt(M.a)}cm의 반 ÷ 코 높이 ${mm(g.h)}mm = ${R}단 · 같은 원을 2장 뜹니다` : hole ? `${prev} + 늘림 6 = ${n} · 손잡이 구멍 ${fmt(M.hw)}cm ÷ 코 너비 ${mm(g.w)}mm = 사슬 ${hs}코 · 단의 시작이 원의 위쪽입니다` : r === rh + 1 && hs > 0 ? `${prev} + 늘림 6 = ${n} · 사슬 ${hs}코에는 코마다 ${SC} 1코씩 뜹니다` : `${prev} + 늘림 6 = ${n}` } as Row);
  }
  rows.push({ part: "join", n: 0, inc: 0, own: true, label: "잇기 준비", how: "두 원의 손잡이 구멍을 위로 맞추고, 원의 좌우 한가운데에 마커링을 하나씩 걸어 아래 반원의 양 끝을 표시합니다", why: "위 반원은 잇지 않고 입구로 둡니다" } as Row);
  rows.push({ part: "join", n: M.J, inc: 0, own: true, label: "아래 반원 잇기", how: `두 원을 겉이 밖으로 오게 맞대고 아래 반원만 되돌아짧은뜨기 ${M.J}코로 잇습니다`, why: `마지막 단 ${N}코의 절반 = ${M.J}코` } as Row);
  return { g, c: 0, rows: number(rows), bottomRounds: 0, bodyRows: R, last: N };
}

// ---------------------------------------------------------------- 보닛
/** a hood's rows stand on this share of a bonnet's crown (a quarter is left open for the face) */
export const BONNET_SHARE = .75;
/** The crown's round as a hat's; rows back and forth on three quarters of it for the depth of the back of the
 *  head: rows = (depth - the crown's radius) / a row's height. A cord at each lower end. */
export function bonnet(p: PlanInput, g: Gauge) {
  const circ = pos(p.circ, WEAR_DEFAULT.circ), depth = pos(p.headH, 20), tie = pos(p.tieCm, 30);
  const R = Math.max(3, rnd(circ / (6 * g.w))), N = 6 * R, W = Math.max(6, rnd(N * BONNET_SHARE)), H = Math.max(2, rnd((depth - R * g.h) / g.h)), C = Math.max(4, rnd(tie / (g.w * .85)));
  return { circ, depth, tie, R, N, W, open: N - W, H, C };
}
export function planBonnet(p: PlanInput, g: Gauge, bottom: Bottom): Plan {
  const B = bonnet(p, g), { R, N, W } = B, rows: Row[] = [];
  bottom({ ...p, shape: "circle", a: 2 * R * g.h, gusset: null }, g).rows.forEach((r, i) => rows.push({ ...r, no: i + 1, label: `${i + 1}단`,
    why: i === 0 ? `시작 · 머리둘레 ${B.circ}cm ÷ (코 너비 ${mm(g.w)}mm × 6코) = ${R}단 동안 원형으로 늘립니다` : i === R - 1 ? `${r.why} · 원형은 여기까지입니다` : r.why } as Row));
  for (let i = 0; i < B.H; i++) rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: `보닛 ${i + 1}단`,
    how: i === 0 ? `기둥사슬 1, ${SC} ${W}코 (남은 ${B.open}코는 얼굴 자리로 비워 둡니다)` : `기둥사슬 1, 뒤집어서 ${SC} ${W}코`,
    why: i === 0 ? `여기서부터 왕복으로 뜹니다 · 정수리 ${N}코의 3/4 = ${W}코 · (뒤통수 깊이 ${fmt(B.depth)}cm − 정수리 반지름 ${fmt(R * g.h)}cm) ÷ 코 높이 ${mm(g.h)}mm = ${B.H}단` : `${W}코 그대로` } as Row);
  rows.push(cord("턱끈 1", B.C, B.tie, "마지막 단 끝에서 이어", g), cord("턱끈 2", B.C, B.tie, "마지막 단의 반대쪽 끝에 새 실을 걸어", g));
  return { g, c: 0, rows: number(rows), bottomRounds: R, bodyRows: B.H, last: W };
}

// ---------------------------------------------------------------- 모티프 뷔스티에
/** h = the band's height = a motif's size: its rounds R = h / (2 x a stitch's width); the motifs round the chest
 *  n = the chest's round x 0.92 / a motif's side. A cup: a fifth of the chest wide at its foot (an odd count),
 *  a stitch fewer at each end every row down to 3. A cord from each cup's tip. */
export function bustier(p: PlanInput, g: Gauge) {
  const bust = pos(p.bust, 84), len = pos(p.h, 14), strap = pos(p.tieCm, 40);
  const R = Math.max(2, rnd(len / (2 * g.w))), E = 2 * R, n = Math.max(4, Math.round(bust * BUST_EASE / (E * g.w))), ring = n * E;
  let Cb = Math.max(7, rnd(bust * .2 / g.w)); if (Cb % 2 === 0) Cb++;
  const CR = (Cb - 3) / 2 + 1, C = Math.max(4, rnd(strap / (g.w * .85)));
  return { bust, len, strap, R, E, n, ring, roundCm: ring * g.w, Cb, CR, C };
}
export function planBustier(p: PlanInput, g: Gauge): Plan {
  const B = bustier(p, g), { R, E, n, ring, Cb, CR } = B, rows: Row[] = [];
  for (let k = 1; k <= n; k++) motifRounds(`띠 모티프 ${k}`, R, k === 1 ? `띠 높이 ${fmt(B.len)}cm ÷ (코 너비 ${mm(g.w)}mm × 2) = ${R}단 · 한 변 ${E}코 = ${fmt(E * g.w)}cm · 가슴둘레 ${B.bust}cm × ${BUST_EASE} ÷ 한 변 = ${n}장` : `띠 모티프 1과 같습니다 (${k}/${n}장)`, rows);
  rows.push({ part: "join", n: 0, inc: 0, own: true, label: "띠 잇기 준비", how: `모티프 ${n}장을 한 줄로 늘어놓고, 맞닿는 변끼리 마커링으로 모서리를 맞춥니다`, why: "잇는 순서: 띠 → 컵 → 어깨끈" } as Row);
  rows.push({ part: "join", n: ring, inc: 0, own: true, label: "띠 잇기", how: `이웃한 두 모티프의 변을 겉이 밖으로 오게 맞대고 두 겹을 함께 떠서 ${SC} ${E}코로 잇습니다. ${n}군데를 이어 고리로 만듭니다 (모두 ${ring}코)`,
    why: `한 변 ${E}코 × ${n}군데 = ${ring}코 · 띠 둘레 ${fmt(B.roundCm)}cm (가슴둘레 ${B.bust}cm, 늘어나는 만큼 작게)` } as Row);
  for (const q of [1, 2]) for (let i = 0; i < CR; i++) {
    const m = Cb - 2 * i;
    rows.push({ part: "flap", n: m, inc: i ? -2 : 0, own: true, label: `컵${q} ${i + 1}단`, edge: i ? [-1, -1] : [0, 0], ...(i ? { work: [1, 1] } : {}),
      how: i === 0 ? `띠 윗변 앞쪽 ${q === 1 ? "왼편" : "오른편"} ${Cb}코에 새 실을 걸어 기둥사슬 1, ${SC} ${Cb}코` : `기둥사슬 1, 뒤집어서 ${SC} 2코 모아뜨기, ${SC} ${m - 2}코, ${SC} 2코 모아뜨기`,
      why: i === 0 ? (q === 1 ? `컵 밑변 = 가슴둘레 ${B.bust}cm × 0.2 ÷ 코 너비 ${mm(g.w)}mm = ${Cb}코 (홀수) · 단마다 양 끝에서 1코씩 줄여 3코까지 ${CR}단` : `컵 1과 같은 ${Cb}코 · 앞 가운데를 사이에 두고 마주 봅니다`) : `${m + 2} - 줄임 2 = ${m} · 양 끝에서 한 코씩` } as Row);
  }
  rows.push(cord("어깨끈 1", B.C, B.strap, "컵 1의 꼭대기 3코에서 이어", g), cord("어깨끈 2", B.C, B.strap, "컵 2의 꼭대기 3코에서 이어", g));
  return { g, c: 1, rows: number(rows), bottomRounds: 0, bodyRows: E, last: ring };
}

// ---------------------------------------------------------------- 그물 홀터 탑
/** The chest's round x 0.92 in arches (4 stitches each, an even number of them); net rounds up for the length
 *  left under the V; then the front half alone, back and forth, an arch fewer a row down to one: the V.
 *  A cord each side from its point. */
export function halter(p: PlanInput, g: Gauge) {
  const bust = pos(p.bust, 84), len = pos(p.h, 30), strap = pos(p.tieCm, 45);
  let A = Math.max(8, Math.round(bust * BUST_EASE / (4 * g.w))); if (A % 2) A++;
  const N = 4 * A, F = A / 2, V = F - 1, vCm = V * 1.45 * g.h, C = Math.max(4, rnd(strap / (g.w * .85)));
  return { bust, len, strap, A, N, F, V, vCm, tubeCm: Math.max(2 * g.h, len - vCm), C, roundCm: N * g.w };
}
type Wall = (k: "net", last: number, hCm: number, g: Gauge) => { rows: Omit<Row, "idx" | "label">[] };
export function planHalter(p: PlanInput, g: Gauge, wall: Wall): Plan {
  const H = halter(p, g), { N, F, V } = H, rows: Row[] = [];
  rows.push({ part: "start", n: N, inc: 0, label: "시작 사슬", how: `사슬 ${N}코, 꼬이지 않게 빼뜨기로 고리 연결`, why: `가슴둘레 ${H.bust}cm × ${BUST_EASE} ÷ 아치 하나 ${mm(4 * g.w)}mm = 아치 ${H.A}개(짝수) = ${N}코 · 둘레 ${fmt(H.roundCm)}cm` } as Row);
  const body = wall("net", N, H.tubeCm, g).rows;
  body.forEach((r, i) => rows.push({ ...r, label: `${i + 1}단`, why: i === 0 ? `길이 ${fmt(H.len)}cm 가운데 V ${fmt(H.vCm)}cm를 뺀 ${fmt(H.tubeCm)}cm를 둘레로 뜹니다 · 한 바퀴 ${N}코 = 아치 ${H.A}개` : r.why } as Row));
  for (let i = 1; i <= V; i++) {
    const k = F - i;
    rows.push({ part: "flap", n: 4 * k, inc: -4, own: true, hk: 1.45, vnet: k, label: `앞 V ${i}단`,
      how: `뒤집어서 첫 아치 가운데까지 빼뜨기로 건너가 기둥사슬 1, 아치 가운데에 ${SC} 1, (사슬 5, 다음 아치 가운데에 ${SC} 1) × ${k}` + (i === 1 ? ` (앞쪽 아치 ${F}개에만 뜹니다)` : ""),
      why: i === 1 ? `한 바퀴 아치 ${H.A}개의 앞쪽 절반 ${F}개 · 단마다 아치 하나씩 줄여 1개까지 ${V}단 = ${fmt(H.vCm)}cm` : `아치 ${k + 1} - 1 = ${k}개` } as Row);
  }
  rows.push(cord("목끈 1", H.C, H.strap, "V 꼭대기 아치의 한쪽에서 이어", g), cord("목끈 2", H.C, H.strap, "V 꼭대기 아치의 반대쪽에 새 실을 걸어", g));
  return { g, c: N, rows: number(rows), bottomRounds: 0, bodyRows: body.length, last: N };
}

// ================================================================ 10종 더 (Kim: 실제 작품들에서 본 구조 원리)
//   매듭 손잡이백     one panel folded in half, its sides joined; the stitches at one end of the opening go on as a
//                    short loop, at the other as a long strap that is put through the loop
//   2WAY 조임 토트    two panels joined into a bag, a row of eyelets under the opening for a cord, two handles
//   바라클라바        a tube up from the neck, widened to the head; the face left open by rows back and forth and
//                    crossed again with chains; the crown closed six stitches a round
//   모티프 머플러     square motifs sized by the gauge joined in one line
//   오버사이즈 양말   from the toe: a round grown to the ankle's round and a little more, one long tube for the foot
//                    and the leg, a cuff that is folded down - two of them (Kim: 룸부츠 대신 그냥 오버사이즈 양말)
// (코인 미니백, 사다리꼴 토트, 접는 덮개 클러치, 링 손잡이백, 미니 그물 버킷 are the bag engine's own - lib/pattern.)

// ---------------------------------------------------------------- 매듭 손잡이백
/** a x h = the bag (cm). The panel: a / a stitch's width across, twice the height in rows (the fold is the
 *  bottom). The loop and the strap: their width / a stitch's width, their lengths / a row's height, each worked
 *  on from the last row's end and sewn to the chain's end on the same side. */
export function knotBag(p: PlanInput, g: Gauge) {
  const a = pos(p.a, 24), h = pos(p.h, 22), long = pos(p.strapCm, 36), short = pos(p.tieCm, 14), hw = pos(p.handleWcm, 5);
  const W = Math.max(8, rnd(a / g.w)), R = Math.max(3, rnd(h / g.h)), T = clamp(rnd(hw / g.w), 2, Math.floor(W / 2) - 1);
  const PS = Math.max(2, rnd(short / g.h)), PL = Math.max(PS + 2, rnd(long / g.h)), sideJ = Math.max(2, rnd(h / g.w));
  return { a, h, long, short, hw, W, R, T, PS, PL, sideJ };
}
export function planKnotBag(p: PlanInput, g: Gauge): Plan {
  const K = knotBag(p, g), { W, R, T, PS, PL, sideJ } = K, rows: Row[] = [];
  rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: "가방 시작 사슬", how: `사슬 ${W}코`, why: `너비 ${fmt(K.a)}cm ÷ 코 너비 ${mm(g.w)}mm = ${W}코 · 이 사슬이 앞쪽 입구입니다` } as Row);
  for (let i = 0; i < 2 * R; i++) rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: `가방 ${i + 1}단`,
    how: i === 0 ? `기둥사슬 1, 사슬 ${W}코에 ${SC} ${W}코` : `기둥사슬 1, 뒤집어서 ${SC} ${W}코`,
    why: i === 0 ? `높이 ${fmt(K.h)}cm ÷ 코 높이 ${mm(g.h)}mm = ${R}단, 반 접을 것이므로 두 배 ${2 * R}단` : i === R ? "여기가 접는 선(바닥)입니다" : `${W}코 그대로` } as Row);
  for (const [q, what, n, cm] of [[0, "고리", PS, K.short], [1, "끈", PL, K.long]] as [0 | 1, string, number, number][]) for (let i = 0; i < n; i++) rows.push({ part: "strap", n: T, inc: 0, own: true, post: q, edge: [0, 0], label: `가방 ${what} ${i + 1}단`,
    how: (i === 0 ? (q === 0 ? `기둥사슬 1, 뒤집어서 끝의 ${T}코에만 ${SC} ${T}코 (가운데 ${W - 2 * T}코는 뜨지 않고 남깁니다)` : `반대쪽 끝 ${T}코에 새 실을 걸어 기둥사슬 1, ${SC} ${T}코`) : `기둥사슬 1, 뒤집어서 ${SC} ${T}코`)
      + (i === n - 1 ? ` · 실을 길게 남기고 잘라 시작 사슬의 같은 쪽 끝 ${T}코에 맞대고 감침질로 잇습니다` : ""),
    why: i === 0 ? `${q ? "긴 끈" : "짧은 고리"} ${fmt(cm)}cm ÷ 코 높이 ${mm(g.h)}mm = ${n}단 · 너비 ${fmt(K.hw)}cm = ${T}코` : `${T}코 그대로` } as Row);
  rows.push({ part: "join", n: 0, inc: 0, own: true, label: "잇기 준비", how: `판을 ${R}단째에서 반 접어 양 옆선을 마커링으로 맞춥니다`, why: "접힌 선이 바닥이고, 시작 사슬과 마지막 단이 입구입니다" } as Row);
  rows.push({ part: "join", n: 2 * sideJ, inc: 0, own: true, label: "옆선 잇기", how: `양 옆선을 각각 되돌아짧은뜨기 ${sideJ}코씩 잇습니다 (모두 ${2 * sideJ}코)`, why: `높이 ${fmt(K.h)}cm ÷ 코 너비 ${mm(g.w)}mm = ${sideJ}코, 양쪽` } as Row);
  rows.push({ part: "join", n: 0, inc: 0, own: true, label: "끼워 묶기", how: "긴 끈을 짧은 고리에 끼워 넣어 손잡이로 씁니다", why: "긴 끈을 당기면 입구가 닫힙니다" } as Row);
  return { g, c: W, rows: number(rows), bottomRounds: 0, bodyRows: 2 * R, last: W };
}

// ---------------------------------------------------------------- 2WAY 조임 토트
/** the cord's row is this far under the opening (cm) */
export const TWOWAY_EYE = 3.5;
/** Two panels a x h: a / a stitch's width across, h / a row's height up; the row 3.5cm under the top is eyelets
 *  (a chain over every other stitch). Joined down a side, along the bottom, up the other. Two handles (a chain
 *  and back), and a cord through the eyelets: once round the opening and a hand's length to tie. */
export function twoWay(p: PlanInput, g: Gauge) {
  const a = pos(p.a, 30), h = pos(p.h, 28), hl = pos(p.handleCm, 36);
  const W = Math.max(8, rnd(a / g.w)), R = Math.max(6, rnd(h / g.h)), eye = clamp(R - rnd(TWOWAY_EYE / g.h), 2, R - 1), holes = Math.floor(W / 2);
  const J = Math.max(3, rnd((2 * h + a) / g.w)), ch = Math.max(4, rnd(hl / (g.w * .85))), cordCm = Math.round(2 * a + 30), C = Math.max(4, rnd(cordCm / (g.w * .85)));
  return { a, h, hl, W, R, eye, holes, J, ch, cordCm, C };
}
export function planTwoWay(p: PlanInput, g: Gauge): Plan {
  const T = twoWay(p, g), { W, R, eye, holes } = T, rows: Row[] = [];
  for (const name of ["앞판", "뒤판"]) {
    rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: `${name} 시작 사슬`, how: `사슬 ${W}코`, why: `너비 ${fmt(T.a)}cm ÷ 코 너비 ${mm(g.w)}mm = ${W}코` } as Row);
    for (let i = 0; i < R; i++) rows.push({ part: "panel", n: W, inc: 0, own: true, edge: [0, 0], label: `${name} ${i + 1}단`, ...(i + 1 === eye ? { eyelet: holes } : {}),
      how: i === 0 ? `기둥사슬 1, 사슬 ${W}코에 ${SC} ${W}코` : i + 1 === eye ? `기둥사슬 1, 뒤집어서 끈 구멍 단: (사슬 1, 1코 건너뛰고 ${SC} 1) × ${holes}${W % 2 ? `, ${SC} 1` : ""}` : `기둥사슬 1, 뒤집어서 ${SC} ${W}코`,
      why: i === 0 ? `높이 ${fmt(T.h)}cm ÷ 코 높이 ${mm(g.h)}mm = ${R}단` : i + 1 === eye ? `입구에서 ${TWOWAY_EYE}cm 아래 = ${eye}단째 · 구멍 ${holes}개에 조임끈을 꿰면 복주머니가 됩니다` : `${W}코 그대로` } as Row);
  }
  rows.push({ part: "join", n: 0, inc: 0, own: true, label: "잇기 준비", how: "잇기 전에 마커링으로 두 판의 옆면·바닥 위치를 먼저 맞춥니다. 끈 구멍 단끼리 같은 높이에 오게 합니다", why: "옆 · 바닥 · 옆이 서로 어긋나지 않게 합니다" } as Row);
  rows.push({ part: "join", n: T.J, inc: 0, own: true, label: "판 잇기", how: `두 판을 겉이 밖으로 오게 맞대고 옆 · 바닥 · 옆을 따라 되돌아짧은뜨기 ${T.J}코로 잇습니다 (왼쪽에서 오른쪽으로 되돌아가며)`,
    why: `옆 ${fmt(T.h)} + 바닥 ${fmt(T.a)} + 옆 ${fmt(T.h)} = ${fmt(2 * T.h + T.a)}cm ÷ 코 너비 ${mm(g.w)}mm = ${T.J}코` } as Row);
  for (let i = 0; i < 2; i++) rows.push({ part: "handle", n: T.ch, inc: 0, label: `손잡이 ${i + 1}`, how: `사슬 ${T.ch}코 (약 ${fmt(T.hl)}cm), ${SC}로 되돌아 뜨고 양쪽에 연결`, why: `${fmt(T.hl)}cm ÷ 사슬 한 코 ${mm(g.w * .85)}mm` } as Row);
  rows.push({ ...cord("조임끈", T.C, T.cordCm, "따로", g), why: `입구 둘레 ${fmt(2 * T.a)}cm + 묶을 여유 30cm = ${T.cordCm}cm ÷ 사슬 한 코 ${mm(g.w * .85)}mm = ${T.C}코 · 끈 구멍 단에 한 바퀴 꿰어 묶습니다` });
  return { g, c: W, rows: number(rows), bottomRounds: 0, bodyRows: R, last: W };
}

// ---------------------------------------------------------------- 바라클라바
/** the neck's tube is this much wider than the neck; under the face 3cm, over it 4cm of plain rounds */
export const BALA_NECK_EASE = 1.1, BALA_CHIN = 3, BALA_BROW = 4;
/** Up from the neck: a ring of chains the neck's round x 1.1 wide, rounds for the neck's height; one round
 *  widens it to the head's round (six stitches a crown round, as a hat's); 3cm on, the face: the stitches across
 *  it left out, rows back and forth for its height, chains across it; 4cm on, the crown closes six a round. */
export function balaclava(p: PlanInput, g: Gauge) {
  const circ = pos(p.circ, WEAR_DEFAULT.circ), neck = pos(p.neckCm, 36), fw = pos(p.faceW, 14), fh = pos(p.faceH, 12), nh = pos(p.h, 8);
  const R1 = Math.max(4, rnd(circ / (6 * g.w))), N1 = 6 * R1, N0 = clamp(rnd(neck * BALA_NECK_EASE / g.w), 12, N1);
  const neckRows = Math.max(2, rnd(nh / g.h)), chin = Math.max(1, rnd(BALA_CHIN / g.h)), F = clamp(rnd(fw / g.w), 4, N1 - 12), faceRows = Math.max(2, rnd(fh / g.h)), brow = Math.max(1, rnd(BALA_BROW / g.h));
  return { circ, neck, fw, fh, nh, R1, N1, N0, neckRows, chin, F, faceRows, brow, ears: !!p.ears };
}
export function planBalaclava(p: PlanInput, g: Gauge): Plan {
  const B = balaclava(p, g), { N0, N1, F } = B, rows: Row[] = []; let k = 0;
  const round = (n: number, prev: number, why: string): Row => ({ part: "body", n, inc: n - prev, label: `${++k}단`, how: n > prev ? `${SC} ${n}코 (늘림 ${n - prev}코를 고르게 나눠서)` : `늘림 없이 ${SC} ${n}코`, why } as Row);
  rows.push({ part: "start", n: N0, inc: 0, label: "시작 사슬", how: `사슬 ${N0}코, 꼬이지 않게 빼뜨기로 고리 연결`, why: `목둘레 ${fmt(B.neck)}cm × ${BALA_NECK_EASE} ÷ 코 너비 ${mm(g.w)}mm = ${N0}코 · 목에서 시작해 위로 뜹니다` } as Row);
  for (let i = 0; i < B.neckRows; i++) rows.push(round(N0, N0, i === 0 ? `목 높이 ${fmt(B.nh)}cm ÷ 코 높이 ${mm(g.h)}mm = ${B.neckRows}단` : `${N0}코 그대로`));
  rows.push(round(N1, N0, `머리둘레 ${B.circ}cm ÷ (코 너비 ${mm(g.w)}mm × 6코) = ${B.R1} → 한 바퀴 ${N1}코 · ${N0} + 늘림 ${N1 - N0} = ${N1}`));
  for (let i = 0; i < B.chin; i++) rows.push(round(N1, N1, i === 0 ? `턱 아래 ${BALA_CHIN}cm = ${B.chin}단` : `${N1}코 그대로`));
  for (let i = 0; i < B.faceRows; i++) rows.push({ part: "panel", n: N1 - F, inc: i ? 0 : -F, own: true, edge: [0, 0], label: `얼굴 ${i + 1}단`,
    how: i === 0 ? `기둥사슬 1, ${SC} ${N1 - F}코 (앞 가운데 ${F}코는 얼굴 구멍으로 남깁니다)` : `기둥사슬 1, 뒤집어서 ${SC} ${N1 - F}코`,
    why: i === 0 ? `얼굴 구멍 너비 ${fmt(B.fw)}cm ÷ 코 너비 ${mm(g.w)}mm = ${F}코를 남기고 왕복으로 뜹니다 · 높이 ${fmt(B.fh)}cm ÷ 코 높이 ${mm(g.h)}mm = ${B.faceRows}단` : `${N1 - F}코 그대로` } as Row);
  rows.push({ part: "body", n: N1, inc: F, own: true, bridge: F, label: `${++k}단`, how: `기둥사슬 1, ${SC} ${N1 - F}코, 사슬 ${F}코로 얼굴 구멍 위를 건너 첫 코에 빼뜨기`, why: `${N1 - F} + 사슬 ${F} = ${N1}코 · 다시 둘레로 뜹니다` } as Row);
  for (let i = 0; i < B.brow; i++) rows.push(round(N1, N1, i === 0 ? `이마 위 ${BALA_BROW}cm = ${B.brow}단 · 사슬 ${F}코에는 코마다 1코씩 뜹니다` : `${N1}코 그대로`));
  for (let r = B.R1 - 1; r >= 1; r--) rows.push({ part: "rim", n: 6 * r, inc: -6, label: `${++k}단`, how: `${SC} ${6 * r}코 (줄임 6번을 고르게 나눠서)`,
    why: `${6 * r + 6} - 줄임 6 = ${6 * r}` + (r === B.R1 - 1 ? " · 정수리를 단마다 6코씩 줄여 닫습니다" : r === 1 ? " · 남은 6코를 돌려 조여 마무리" : "") } as Row);
  if (B.ears) {
    for (const name of ["귀 1", "귀 2"]) for (let r = 1; r <= 3; r++) rows.push({ part: "flap", n: 6 * r, inc: r === 1 ? 0 : 6, own: true, label: `${name} ${r}단`, disc: { name, r },
      how: r === 1 ? `매직링에 기둥사슬 1, ${SC} 6코, 첫 코에 빼뜨기` : r === 2 ? "기둥사슬 1, 모든 코에 늘림, 첫 코에 빼뜨기" : `기둥사슬 1, (${SC} 1, 늘림 1) × 6, 첫 코에 빼뜨기`, why: r === 1 ? "작은 원을 2장 뜹니다" : `${6 * r - 6} + 늘림 6 = ${6 * r}` } as Row);
    rows.push({ part: "join", n: 0, inc: 0, own: true, label: "귀 달기", how: "작은 원 두 장을 정수리 양옆에 세워 아래쪽을 꿰매어 답니다", why: "귀 장식 · 코 수는 바뀌지 않습니다" } as Row);
  }
  return { g, c: N0, rows: number(rows), bottomRounds: 0, bodyRows: B.neckRows + 1 + B.chin + 1 + B.brow, last: N1 };
}

// ---------------------------------------------------------------- 모티프 머플러
export type MotifColors = "one" | "alt" | "ring";
/** a = the scarf's width = a motif's side: its rounds R = a / (2 x a stitch's width); b = its length: the motifs
 *  n = b / a motif's side. Joined in one line: (n - 1) seams of a side's stitches. */
export function motifScarf(p: PlanInput, g: Gauge) {
  const a = pos(p.a, 14), b = pos(p.b, 140), R = Math.max(2, rnd(a / (2 * g.w))), E = 2 * R, n = Math.max(2, Math.round(b / (E * g.w)));
  const colors: MotifColors = p.motifColors === "alt" || p.motifColors === "ring" ? p.motifColors : "one";
  return { a, b, R, E, n, colors, turn: Math.floor(R / 2) + 1, sideCm: E * g.w, lenCm: n * E * g.w };
}
export function planMotifScarf(p: PlanInput, g: Gauge): Plan {
  const M = motifScarf(p, g), { R, E, n } = M, rows: Row[] = [];
  for (let k = 1; k <= n; k++) {
    const at = rows.length, tone = M.colors === "alt" ? ` · ${k % 2 ? "바탕색" : "배색"}으로 뜹니다` : "";
    motifRounds(`모티프 ${k}`, R, k === 1 ? `폭 ${fmt(M.a)}cm ÷ (코 너비 ${mm(g.w)}mm × 2) = ${R}단 · 한 변 ${E}코 = ${fmt(M.sideCm)}cm · 길이 ${fmt(M.b)}cm ÷ 한 변 = ${n}장${tone}` : `모티프 1과 같습니다 (${k}/${n}장)${tone}`, rows);
    if (M.colors === "ring" && R >= 2) rows[at + M.turn - 1].why += " · 여기서부터 배색으로 바꿔 테두리를 뜹니다";
  }
  rows.push({ part: "join", n: 0, inc: 0, own: true, label: "잇기 준비", how: `모티프 ${n}장을 한 줄로 늘어놓고${M.colors === "alt" ? " (바탕색과 배색을 번갈아)" : ""}, 맞닿는 변끼리 마커링으로 모서리를 맞춥니다`, why: `모두 ${n - 1}군데를 잇습니다` } as Row);
  rows.push({ part: "join", n: (n - 1) * E, inc: 0, own: true, label: "모티프 잇기", how: `이웃한 두 모티프의 변을 겉이 밖으로 오게 맞대고 두 겹을 함께 떠서 ${SC} ${E}코로 잇습니다. ${n - 1}군데를 이어 한 줄로 만듭니다 (모두 ${(n - 1) * E}코)`,
    why: `한 변 ${E}코 × ${n - 1}군데 = ${(n - 1) * E}코 · 길이 ${fmt(M.lenCm)}cm` } as Row);
  return { g, c: 1, rows: number(rows), bottomRounds: 0, bodyRows: E, last: n * E };
}

// ---------------------------------------------------------------- 오버사이즈 양말
/** the tube against the ankle's round (Kim: 오버사이즈 - it sits loose) */
export const SOCK_EASE = 1.15;
/** From the toe: a round grown six stitches a round until it is the ankle's round x 1.15; then one tube, without
 *  a stitch more, for the foot's length and the leg's height (the toe's rounds are part of the foot); a round in
 *  the back loop (the fold) and the cuff's rounds, folded down. A pair: the same again. */
export function bigSocks(p: PlanInput, g: Gauge) {
  const foot = pos(p.footL, 24), ankle = pos(p.ankleCm, 24), hgt = pos(p.h, 16), cuff = p.cuffCm != null && p.cuffCm >= 0 ? p.cuffCm : 4;
  const R = Math.max(3, rnd(ankle * SOCK_EASE / (6 * g.w))), N = 6 * R, toeCm = R * g.h, rows = Math.max(4, rnd((foot + hgt - toeCm) / g.h)), heel = clamp(rnd((foot - toeCm) / g.h), 1, rows - 1);
  return { foot, ankle, hgt, cuff, R, N, toeCm, rows, heel, cuffRows: cuff >= g.h / 2 ? Math.max(1, rnd(cuff / g.h)) : 0 };
}
export function planBigSocks(p: PlanInput, g: Gauge, bottom: Bottom): Plan {
  const B = bigSocks(p, g), { R, N } = B, rows: Row[] = []; let k = 0;
  bottom({ ...p, shape: "circle", a: 2 * R * g.h, gusset: null }, g).rows.forEach((r, i) => rows.push({ ...r, no: i + 1, label: `${++k}단`,
    why: i === 0 ? `발끝에서 시작합니다 · 발목 둘레 ${fmt(B.ankle)}cm × ${SOCK_EASE} ÷ (코 너비 ${mm(g.w)}mm × 6코) = ${R}단 동안 늘립니다` : i === R - 1 ? `${r.why} · 한 바퀴 ${N}코 = ${fmt(N * g.w)}cm, 넉넉한 통이 됩니다` : r.why } as Row));
  for (let i = 0; i < B.rows; i++) rows.push({ part: "body", n: N, inc: 0, label: `${++k}단`, how: `늘림 없이 ${SC} ${N}코`,
    why: i === 0 ? `여기서부터 통으로 뜹니다 · (발 길이 ${fmt(B.foot)}cm + 목 높이 ${fmt(B.hgt)}cm − 발끝 ${fmt(B.toeCm)}cm) ÷ 코 높이 ${mm(g.h)}mm = ${B.rows}단` : i === B.heel ? `여기가 뒤꿈치 자리입니다 (발 길이 ${fmt(B.foot)}cm) · ${N}코 그대로 목으로 올라갑니다` : `${N}코 그대로` } as Row);
  for (let i = 0; i < (B.cuffRows ? B.cuffRows + 1 : 0); i++) rows.push({ part: "rim", n: N, inc: 0, label: `${++k}단`, how: i === 0 ? `뒷고리에만 ${SC} ${N}코` : `${SC} ${N}코`,
    why: i === 0 ? `접는 선입니다 · 접는 단 ${fmt(B.cuff)}cm ÷ 코 높이 ${mm(g.h)}mm = ${B.cuffRows}단을 더 떠서 밖으로 접어 내립니다` : `${N}코 그대로` } as Row);
  rows.push({ part: "finish", n: 0, inc: 0, own: true, label: "한 짝 더", how: "같은 방법으로 한 짝을 더 뜹니다", why: "양말은 두 짝입니다. 실은 한 짝의 두 배가 듭니다" } as Row);
  return { g, c: 0, rows: number(rows), bottomRounds: R, bodyRows: B.rows, last: N, pairs: 2 };
}

/** the line the screen shows under a wear piece's sizes */
export function wearNote(p: PlanInput, g: Gauge, g0: Gauge = g): string {
  switch (p.item) {
    case "knitfold": { const B = knitFold(p, g); return `${B.W}코로 ${B.L}단을 떠서 반 접고, 남긴 ${B.K}코로 끈 ${B.SR}단을 떠서 잇습니다. 입구 테두리는 짧은뜨기 ${B.top}코입니다.`; }
    case "knittop": { const K = knitTop(p, g); return `뒤판 ${K.T}코에서 진동 ${K.AR}단 동안 늘려 ${K.Half}코, 몸통은 한 바퀴 ${K.N}코로 ${K.BR}단, 소매는 ${K.P}코에서 ${K.d ? `${K.every}단마다 줄여 ${K.P - 2 * K.d}코` : "곧게"}입니다.`; }
    case "buckethat": { const H = bucketHat(p, g); return `정수리를 ${H.R}단 동안 늘려 한 바퀴 ${H.N}코(${fmt(H.N * g.w)}cm)가 되면, 늘림 없이 ${H.S}단을 내려 뜹니다.` + (H.B ? ` 챙은 ${H.B}단, 마지막 단 ${H.counts[H.B - 1]}코입니다.` : ""); }
    case "motifhat": { const M = motifHat(p, g); return `모티프 하나는 ${M.R}단, 한 변 ${M.E}코(${fmt(M.sizeCm)}cm)입니다. 옆 ${M.n}장의 둘레는 ${fmt(M.roundCm)}cm(머리둘레 ${M.circ}cm), 정수리는 ${M.Rc}단, 챙은 ${M.Rb}단짜리 ${M.n}장입니다.`; }
    case "hoodscarf": { const H = hoodScarf(p, g); return `정수리를 ${H.R}단 동안 늘려 ${H.N}코, 그 가운데 ${H.W}코로 ${H.H}단을 왕복해 내려 뜹니다. 양 끝 ${H.T}코씩 ${H.PR}단이 스카프 끈입니다.`; }
    case "earflap": { const H = earflap(p, g); return `사슬 ${H.W}코로 시작해 ${H.R}단을 내려 뜨고, 양 끝 ${H.T}코씩 ${H.PR}단이 귀덮개입니다. 반 접어 위 ${H.J}코를 잇습니다.`; }
    case "trapbag": { const B = trapBag(p, g); return `사슬 ${B.n0}코에서 시작해 ${B.R}단 동안 양 끝을 고르게 늘려 ${B.W}코가 됩니다. 같은 판 2장을 바닥 ${B.n0}코, 옆선 ${B.sideJ}코씩 잇습니다. 손잡이는 ${B.T}코로 ${B.HR}단입니다.`; }
    case "moonbag": { const M = moonBag(p, g); return `원 하나는 ${M.R}단, 마지막 단 ${M.N}코입니다.` + (M.hs ? ` ${M.rh}단에서 사슬 ${M.hs}코로 손잡이 구멍을 냅니다.` : " 손잡이 구멍은 없습니다.") + ` 아래 반원 ${M.J}코를 잇습니다.`; }
    case "bonnet": { const B = bonnet(p, g); return `정수리를 ${B.R}단 동안 늘려 ${B.N}코, 그 가운데 ${B.W}코로 ${B.H}단을 왕복해 내려 뜹니다. 턱끈은 사슬 ${B.C}코씩입니다.`; }
    case "bustier": { const B = bustier(p, g); return `모티프 하나는 ${B.R}단, 한 변 ${B.E}코입니다. ${B.n}장을 이은 띠의 둘레는 ${fmt(B.roundCm)}cm(가슴둘레 ${B.bust}cm)입니다. 컵은 ${B.Cb}코에서 3코까지 ${B.CR}단입니다.`; }
    case "halter": { const H = halter(p, g); return `사슬 ${H.N}코(아치 ${H.A}개, 둘레 ${fmt(H.roundCm)}cm)로 시작해 그물을 ${fmt(H.tubeCm)}cm 떠 올립니다. 앞쪽 아치 ${H.F}개를 단마다 하나씩 줄여 ${H.V}단의 V로 모읍니다.`; }
    case "knotbag": { const K = knotBag(p, g); return `사슬 ${K.W}코로 ${2 * K.R}단을 떠서 반 접습니다. 옆선은 ${K.sideJ}코씩 잇습니다. 짧은 고리는 ${K.T}코로 ${K.PS}단, 긴 끈은 ${K.PL}단입니다.`; }
    case "twoway": { const T = twoWay(p, g); return `판 하나는 ${T.W}코 × ${T.R}단, ${T.eye}단째가 끈 구멍 단(구멍 ${T.holes}개)입니다. 두 판을 ${T.J}코로 잇고, 조임끈은 약 ${T.cordCm}cm입니다.`; }
    case "balaclava": { const B = balaclava(p, g); return `목 ${B.N0}코로 ${B.neckRows}단을 올리고 ${B.N1}코로 늘립니다. 얼굴 구멍은 ${B.F}코를 남기고 ${B.faceRows}단, 사슬 ${B.F}코로 건넌 뒤 정수리를 ${B.R1 - 1}단 동안 줄입니다.`; }
    case "motifscarf": { const M = motifScarf(p, g); return `모티프 하나는 ${M.R}단, 한 변 ${M.E}코(${fmt(M.sideCm)}cm)입니다. ${M.n}장을 이으면 길이 ${fmt(M.lenCm)}cm입니다.`; }
    case "bigsocks": { const B = bigSocks(p, g); return `발끝을 ${B.R}단 동안 늘려 한 바퀴 ${B.N}코(${fmt(B.N * g.w)}cm), 통은 ${B.rows}단이고 ${B.heel + 1}단째가 뒤꿈치 자리입니다. 접는 단은 ${B.cuffRows}단, 두 짝을 뜹니다.`; }
    case "kerchief": { const K = kerchief(p, g0, g); return K.kind === "sc" ? `3코에서 시작해 단마다 양 끝에서 1코씩 늘려 ${K.R}단, 긴 변 ${K.W}코(${fmt(K.W * g0.w)}cm)입니다. 높이는 약 ${fmt(K.heightCm)}cm입니다.` : `${K.kind === "net" ? "아치" : "V"} 하나에서 시작해 단마다 하나씩 늘려 ${K.R}단, 긴 변은 ${K.kind === "net" ? "아치" : "V"} ${K.R}개(${fmt(K.W * g0.w)}cm)입니다. 높이는 약 ${fmt(K.heightCm)}cm입니다.`; }
  }
  return "";
}

// ---------------------------------------------------------------- 보틀백
/** A bottle's bag from the bottle's own sizes: the bottom a little wider than the bottle (1cm of ease), the body
 *  up to its shoulder (three quarters of its height). These are the bag's a and h. */
export const BOTTLE_EASE = 1, BOTTLE_SHARE = .75;
export function bottleDims(d: number, h: number): { a: number; h: number } {
  return { a: Math.round((d + BOTTLE_EASE) * 2) / 2, h: Math.round(h * BOTTLE_SHARE * 2) / 2 };
}

// ---------------------------------------------------------------- 조립하기의 부품 (Kim: 시안 "입력 A" - 다른 부품처럼 슬라이더 한 줄)
/** A slider of a starter's own part: the draft's field it moves, its range, the size it starts from, its unit.
 *  `set`: what else moves with it (a bottle's width moves the bag's bottom). */
export interface KitField { key: keyof Draft; label: string; min: number; max: number; step: number; def: number; unit: string; set?: (d: Draft, v: number) => Partial<Draft>;
  /** its value when it is not the field's own number (a slope read off two widths, a share of a height) */
  get?: (d: Draft) => number }
/** a choice among a few (tiles): what is picked now, the choices [value, name, a line], what picking one sets */
export interface KitPick { label: string; value: (d: Draft) => string; options: [string, string, string?][]; set: (v: string) => Partial<Draft> }
/** a part of a starter as 조립하기 shows it: its tab, its heading, its sliders and choices, a line of help, and
 *  how "지금 조립된 것" says it */
export interface KitPart { key: string; title: string; sub: string; fields: KitField[]; picks?: KitPick[]; help: string; sum: (d: Draft) => string }
const F = (key: keyof Draft, label: string, min: number, max: number, def: number, step = .5, unit = "cm"): KitField => ({ key, label, min, max, step, def, unit });
const val = (d: Draft, f: KitField) => { if (f.get) { const g = f.get(d); return Number.isFinite(g) ? g : f.def; } const v = d[f.key]; return typeof v === "number" && Number.isFinite(v) ? v : f.def; };
/** a field's value now (the size it starts from while none is set), inside its range */
export const kitValue = (d: Draft, f: KitField) => clamp(val(d, f), f.min, f.max);
const head = (hh?: KitField): KitPart => ({ key: "head", title: "머리", sub: "쓰는 사람의 치수입니다", fields: [F("circ", "머리둘레", 44, 64, WEAR_DEFAULT.circ), ...(hh ? [hh] : [])], help: "",
  sum: d => `둘레 ${val(d, F("circ", "", 0, 0, WEAR_DEFAULT.circ))}cm` + (hh ? ` · ${hh.label} ${val(d, hh)}cm` : "") });
const ties = (title: string, sub: string, len: KitField, wid: KitField | null, help: string): KitPart => ({ key: "tie", title, sub, fields: wid ? [len, wid] : [len], help, sum: d => `길이 ${val(d, len)}cm` + (wid ? ` · 너비 ${val(d, wid)}cm` : "") });
/** a starter's size as a line (확인, 도안 보기): the head's round, a bottle's sizes - not a bottom's diameter. Null: not one of these. */
export function kitSize(d: { item?: string; free?: unknown; paint?: unknown }): string | null {
  const k = !d.free && !d.paint && d.item ? KITS[d.item] : undefined; if (!k) return null;
  const dd = d as Draft;
  const lead: Record<string, string> = { bottlebag: "병 ", phonebag: "휴대폰 ", trapbag: "", moonbag: "", stepbag: "", bustier: "", halter: "",
    knotbag: "", coinbag: "", traptote: "바닥 ", clutch: "", ringbag: "", netbucket: "바닥 ", twoway: "", balaclava: "", motifscarf: "", bigsocks: "", knitfold: "", knittop: "" };
  return d.item === "backpack" ? `바닥 지름 ${dd.a}cm · 높이 ${dd.h}cm` : `${lead[d.item!] ?? "머리"}${k[0].sum(dd)}`;
}
export const KITS: Record<string, KitPart[]> = {
  // 대바늘 기본형 (lib/knitwear)
  knitfold: [
    { key: "fold", title: "판", sub: "긴 판 하나를 반 접습니다", fields: [F("a", "너비", 16, 44, 30), F("h", "높이", 14, 40, 26)],
      help: "높이의 두 배로 길게 떠서 가운데에서 반 접고 양 옆선을 잇습니다. 접힌 선이 바닥이 됩니다.", sum: d => `너비 ${d.a}cm · 높이 ${d.h}cm` },
    { key: "kstrap", title: "끈", sub: "마지막 단에서 남긴 코로 이어 뜹니다", fields: [F("handleWcm", "끈 너비", 2.5, 8, 4), F("strapCm", "끈 길이", 30, 110, 60, 1)],
      help: "마지막 단에서 끈 너비만큼만 남기고 코막음한 뒤, 남긴 코로 끈을 떠서 반대쪽 시작 코와 메리야스 잇기로 잇습니다. 입구는 코바늘 짧은뜨기로 두릅니다.", sum: d => `끈 ${d.strapCm ?? 60}cm · 너비 ${d.handleWcm ?? 4}cm` },
  ],
  knittop: [
    { key: "bust", title: "몸", sub: "입는 사람의 치수입니다", fields: [F("bust", "가슴둘레", 76, 120, 92, 1), F("h", "총 길이", 36, 70, 52, 1)],
      help: "가슴둘레에 여유 8cm를 더해 앞뒤 판과 몸통의 코 수를 정합니다. 총 길이는 어깨에서 밑단까지입니다.", sum: d => `가슴둘레 ${d.bust ?? 92}cm · 길이 ${d.h}cm` },
    { key: "sleeve", title: "소매", sub: "진동 둘레에서 코를 주워 뜹니다", fields: [F("sleeveCm", "소매 길이", 8, 56, 40, 1)],
      help: "진동 둘레의 단에서 코를 주워 둘레로 뜨고, 겨드랑이 양쪽에서 일정한 간격으로 줄여 소맷부리까지 좁힙니다.", sum: d => `소매 ${d.sleeveCm ?? 40}cm` },
  ],
  buckethat: [
    { ...head(F("h", "옆 높이", 4, 14, WEAR_DEFAULT.side)), sub: "정수리에서 시작해 내려 뜹니다", help: "머리둘레에 닿을 때까지만 정수리를 늘립니다. 그 뒤로는 코 수 그대로 옆을 뜹니다." },
    { key: "brim", title: "챙", sub: "단마다 같은 비율로 늘립니다", fields: [F("brimCm", "챙 너비", 0, 12, WEAR_DEFAULT.brim)],
      picks: [{ label: "챙 겹", value: d => (d.brimFold ? "2" : "1"), options: [["1", "한 겹"], ["2", "두 겹", "두 배로 떠서 안으로 접어 잇기"]], set: v => ({ brimFold: v === "2" }) }],
      help: `단마다 앞 단 코 수의 ${Math.round(BRIM_RATE * 100)}%씩 늘립니다. 두 겹 챙은 같은 단 수를 되돌아 떠서 안으로 접어 잇습니다.`,
      sum: d => ((d.brimCm ?? WEAR_DEFAULT.brim) < .3 ? "없음" : `너비 ${d.brimCm ?? WEAR_DEFAULT.brim}cm · ${d.brimFold ? "두 겹" : "한 겹"}`) },
  ],
  motifhat: [
    { ...head(), help: "옆 모티프를 이은 고리의 둘레가 머리둘레에 가장 가깝게 모티프의 단 수를 정합니다." },
    { key: "motif", title: "모티프", sub: "정수리 1장 · 옆과 챙은 같은 장 수", fields: [F("motifN", "옆 모티프", 4, 12, WEAR_DEFAULT.motifN, 1, "장"), F("brimMore", "챙 모티프 더 뜨기", 0, 4, WEAR_DEFAULT.brimMore, 1, "단")],
      help: "잇는 순서는 옆 → 정수리 → 챙 → 챙 달기입니다. 챙 모티프를 더 크게 뜰수록 챙이 아래로 벌어집니다.",
      sum: d => `옆 ${d.motifN ?? WEAR_DEFAULT.motifN}장 · 챙 ${d.motifN ?? WEAR_DEFAULT.motifN}장 (${d.brimMore ?? WEAR_DEFAULT.brimMore}단 더) · 정수리 1장` },
  ],
  hoodscarf: [
    { ...head(F("headH", "머리 높이", 20, 40, WEAR_DEFAULT.hoodH)), sub: "정수리에서 목까지", help: "정수리를 원형으로 뜬 뒤, 그 둘레의 2/3로 왕복해 내려 뜹니다. 남긴 1/3이 얼굴 자리입니다." },
    ties("스카프 끈", "후드 양 끝에서 이어 뜹니다", F("tieCm", "끈 길이", 20, 120, WEAR_DEFAULT.tie.hoodscarf, 1), F("tieWcm", "끈 너비", 3, 15, WEAR_DEFAULT.tieW), "후드 마지막 단의 양 끝 몇 코만 각각 길게 떠서 스카프 끈으로 씁니다."),
  ],
  earflap: [
    { ...head(F("headH", "머리 높이", 16, 34, WEAR_DEFAULT.headH)), sub: "정수리에서 턱까지", help: "머리둘레의 절반 너비로 판을 떠서 반 접고, 시작 사슬 쪽(위)을 잇습니다." },
    ties("귀덮개", "판 아래 양 끝에서 이어 뜹니다", F("tieCm", "귀덮개 길이", 10, 60, WEAR_DEFAULT.tie.earflap, 1), F("tieWcm", "귀덮개 너비", 4, 14, WEAR_DEFAULT.tieW), "판 마지막 단의 양 끝 몇 코만 각각 길게 내려 뜹니다."),
    { key: "rib", title: "앞선", sub: "얼굴선 무늬", fields: [], picks: [{ label: "앞선 무늬", value: d => ((d.ribRows ?? WEAR_DEFAULT.rib) >= 2 ? "on" : "off"), options: [["off", "없음"], ["on", "앞걸어 · 뒤걸어", "얼굴선에 3단"]], set: v => ({ ribRows: v === "on" ? WEAR_DEFAULT.rib : 0 }) }],
      help: "얼굴선을 따라 한길긴뜨기 1단을 뜬 뒤, 앞걸어뜨기와 뒤걸어뜨기를 번갈아 세로 골을 만듭니다.", sum: d => ((d.ribRows ?? WEAR_DEFAULT.rib) >= 2 ? `앞걸어 · 뒤걸어 ${d.ribRows ?? WEAR_DEFAULT.rib}단` : "없음") },
  ],
  kerchief: [
    { ...head(), sub: `긴 변은 머리둘레의 ${KERCHIEF_SHARE * 100}%입니다`, help: "꼭짓점에서 시작해 단마다 양 끝을 늘립니다. 긴 변에 닿으면 끝납니다." },
    { key: "lace", title: "무늬", sub: "삼각형을 뜨는 코", fields: [], picks: [{ label: "무늬", value: d => (d.crochetChart === "net" ? "net" : d.crochetChart === "vst" ? "vst" : "sc"), options: [["sc", "짧은뜨기", "촘촘하게"], ["net", "그물", "사슬 5코 아치"], ["vst", "레이스", "V 무늬"]],
        set: v => ({ crochetChart: v === "sc" ? undefined : (v as "net" | "vst"), pattern: undefined, crochetStitch: undefined }) }],
      help: "그물은 단마다 아치 하나씩, 레이스는 단마다 V 하나씩 늘어납니다.", sum: d => (d.crochetChart === "net" ? "그물" : d.crochetChart === "vst" ? "레이스" : "짧은뜨기") },
    ties("묶는 끈", "긴 변의 양 끝에 하나씩", F("tieCm", "끈 길이", 10, 50, WEAR_DEFAULT.tie.kerchief, 1), null, "사슬을 뜨고 빼뜨기로 되돌아와 끈을 만듭니다."),
  ],
  bottlebag: [
    { key: "bottle", title: "병", sub: "담을 병의 크기입니다", fields: [
        { ...F("bottleD", "병 지름", 4, 13, 7), set: (d, v) => ({ bottleD: v, ...bottleDims(v, d.bottleH ?? 22) }) },
        { ...F("bottleH", "병 높이", 10, 40, 22), set: (d, v) => ({ bottleH: v, ...bottleDims(d.bottleD ?? 7, v) }) }],
      help: `바닥은 병 지름에 여유 ${BOTTLE_EASE}cm를 더하고, 몸통은 병 높이의 ${BOTTLE_SHARE * 100}%(어깨)까지 올립니다.`, sum: d => `지름 ${d.bottleD ?? 7}cm · 높이 ${d.bottleH ?? 22}cm` },
    { key: "net", title: "그물", sub: "몸통의 구멍 크기", fields: [], picks: [{ label: "구멍 크기", value: d => String(d.netCh ?? 5), options: [["3", "작게", "사슬 3코 아치"], ["5", "보통", "사슬 5코 아치"], ["7", "크게", "사슬 7코 아치"]], set: v => ({ netCh: Number(v) as 3 | 5 | 7, crochetChart: "net" }) }],
      help: "아치가 클수록 한 바퀴의 아치 수와 몸통 단 수가 줄어듭니다. 입구는 짧은뜨기로 정리합니다.", sum: d => `사슬 ${d.netCh ?? 5}코 아치` },
    { key: "tie", title: "끈", sub: "어깨에 메는 긴 끈", fields: [{ ...F("handleCm", "끈 길이", 40, 150, 110, 1), set: (_d, v) => ({ handle: "long", handleCm: v, handleCount: 1 }) }], help: "사슬을 뜨고 짧은뜨기로 되돌아와 입구 양쪽에 연결합니다. 크로스로 메려면 약 110~120cm입니다.", sum: d => `크로스 ${d.handleCm ?? 110}cm` },
  ],
  trapbag: [
    { key: "trap", title: "판", sub: "같은 사다리꼴을 2장 뜹니다", fields: [F("a", "좁은 쪽 너비", 6, 24, 12), F("topA", "넓은 쪽 너비", 12, 44, 26), F("h", "높이", 10, 36, 20)],
      help: "좁은 쪽에서 시작해 양 끝을 고르게 늘립니다. 좁은 쪽끼리 잇고 옆선을 이으면 바닥이 모이고 몸통이 둥글게 부풉니다.", sum: d => `좁은 쪽 ${d.a}cm · 넓은 쪽 ${d.topA ?? 26}cm · 높이 ${d.h}cm` },
    { key: "tie", title: "손잡이", sub: "입구에서 이어 뜨는 띠", fields: [{ ...F("handleCm", "길이", 20, 80, 40, 1), set: (_d, v) => ({ handle: "short", handleCm: v }) }, F("handleWcm", "너비", 2, 8, 4)],
      help: "입구 한쪽 옆선에서 띠를 이어 떠서 반대쪽 옆선에 잇습니다.", sum: d => `띠 ${d.handleCm ?? 40}cm · 너비 ${d.handleWcm ?? 4}cm` },
  ],
  moonbag: [
    { key: "disc", title: "원", sub: "같은 원을 2장 뜹니다", fields: [F("a", "지름", 12, 32, 20)], help: "두 원의 아래 반원만 이어 주머니로 만듭니다. 위 반원이 입구입니다.", sum: d => `지름 ${d.a}cm · 2장` },
    { key: "slot", title: "손잡이 구멍", sub: "위 반원 안쪽에 냅니다", fields: [F("holeW", "구멍 너비", 0, 14, 8)], help: "한 단에서 사슬로 띄워 구멍을 내고, 다음 단은 그 사슬에 뜹니다. 0이면 구멍을 내지 않습니다.", sum: d => ((d.holeW ?? 8) < 1 ? "없음" : `너비 ${d.holeW ?? 8}cm`) },
  ],
  stepbag: [
    { key: "tube", title: "몸통", sub: "사슬 양쪽을 둘러 뜬 납작한 통", fields: [F("a", "가로", 10, 30, 18), F("h", "세로", 8, 24, 12)], help: "시작 사슬 양쪽을 한 바퀴 떠서 바닥 너비 없이 곧게 올라갑니다.", sum: d => `${d.a} × ${d.h}cm` },
    { key: "stair", title: "계단 덮개", sub: "뒤판 위에서 이어 뜹니다", fields: [{ ...F("flapCm", "덮개 길이", 4, 16, 8), set: (_d, v) => ({ flapCm: v, closure: "flap" }) }, F("flapStepRows", "몇 단마다", 1, 6, 2, 1, "단"), F("flapStepSt", "몇 코씩", 1, 5, 2, 1, "코")],
      help: "정한 단 수마다 양 끝을 정한 코 수만큼 줄여 계단 모양을 만듭니다. 첫 코들은 빼뜨기로 건너가고 마지막 코들은 남깁니다.", sum: d => `길이 ${d.flapCm ?? 8}cm · ${d.flapStepRows ?? 2}단마다 ${d.flapStepSt ?? 2}코씩` },
    { key: "tie", title: "어깨끈", sub: "짧게 메는 끈", fields: [{ ...F("handleCm", "끈 길이", 30, 90, 50, 1), set: (_d, v) => ({ handle: "short", handleCm: v, handleCount: 1 }) }], help: "사슬을 뜨고 짧은뜨기로 되돌아와 입구 양쪽에 연결합니다.", sum: d => `${d.handleCm ?? 50}cm` },
  ],
  phonebag: [
    { key: "phone", title: "휴대폰", sub: "넣을 휴대폰의 크기입니다", fields: [
        { ...F("phoneW", "휴대폰 가로", 5, 11, 7.5), set: (d, v) => ({ phoneW: v, ...phoneDims(v, d.phoneH ?? 16) }) },
        { ...F("phoneH", "휴대폰 세로", 10, 20, 16), set: (d, v) => ({ phoneH: v, ...phoneDims(d.phoneW ?? 7.5, v) }) }],
      help: `가로와 세로에 여유 ${PHONE_EASE}cm씩을 더해 납작한 통으로 뜹니다.`, sum: d => `${d.phoneW ?? 7.5} × ${d.phoneH ?? 16}cm` },
    { key: "edge", title: "테두리", sub: "입구의 장식 단", fields: [], picks: [{ label: "테두리 무늬", value: d => d.rimChart ?? "none", options: [["none", "없음", "짧은뜨기로 마무리"], ["shell", "부채", "한길긴뜨기 5코"], ["net", "아치", "사슬 5코"], ["moss", "모스", "사슬 1코씩"]],
        set: v => ({ rimChart: v === "none" ? undefined : (v as "shell" | "net" | "moss") }) }],
      help: "입구 한 바퀴를 무늬의 코 단위에 맞춘 뒤, 짧은뜨기 한 단 위에 무늬 한 단을 뜹니다.", sum: d => ({ shell: "부채 무늬", net: "아치 무늬", moss: "모스 무늬" } as Record<string, string>)[d.rimChart ?? ""] ?? "없음" },
    { key: "tie", title: "끈", sub: "몸에 가로질러 메는 긴 끈", fields: [{ ...F("handleCm", "끈 길이", 80, 150, 120, 1), set: (_d, v) => ({ handle: "long", handleCm: v, handleCount: 1 }) }], help: "사슬을 뜨고 짧은뜨기로 되돌아와 입구 양쪽에 연결합니다.", sum: d => `크로스 ${d.handleCm ?? 120}cm` },
  ],
  bonnet: [
    { ...head(F("headH", "뒤통수 깊이", 14, 30, 20)), sub: "정수리에서 뒤통수 아래까지", help: "정수리를 원형으로 뜬 뒤, 그 둘레의 3/4으로 왕복해 뒤통수를 감쌉니다. 남긴 1/4이 얼굴 자리입니다." },
    ties("턱끈", "아래 양 끝에 하나씩", F("tieCm", "끈 길이", 15, 50, 30, 1), null, "사슬을 뜨고 빼뜨기로 되돌아와 끈을 만듭니다. 옆 장식(꽃 모티프)은 다 뜬 뒤 꿰매어 답니다."),
  ],
  bustier: [
    { key: "bust", title: "몸", sub: "입는 사람의 치수입니다", fields: [F("bust", "가슴둘레", 60, 120, 84, 1), F("h", "띠 높이", 8, 24, 14)],
      help: `띠 높이가 모티프 한 변입니다. 띠의 둘레는 가슴둘레의 ${BUST_EASE * 100}%에 가장 가깝게 모티프 장 수를 정합니다.`, sum: d => `가슴둘레 ${d.bust ?? 84}cm · 띠 높이 ${d.h}cm` },
    ties("어깨끈", "컵 꼭대기에서 이어 뜹니다", F("tieCm", "끈 길이", 20, 70, 40, 1), null, "잇는 순서는 모티프 띠 → 컵 두 개 → 어깨끈입니다. 끈은 목 뒤나 등에서 묶습니다."),
  ],
  halter: [
    { key: "bust", title: "몸", sub: "입는 사람의 치수입니다", fields: [F("bust", "가슴둘레", 60, 120, 84, 1), F("h", "길이", 18, 50, 30)],
      help: "그물을 둘레로 떠 올라가다, 앞쪽 절반만 왕복하며 단마다 아치 하나씩 줄여 V로 모읍니다.", sum: d => `가슴둘레 ${d.bust ?? 84}cm · 길이 ${d.h}cm` },
    ties("목끈", "V 꼭대기에서 이어 뜹니다", F("tieCm", "끈 길이", 20, 70, 45, 1), null, "사슬을 뜨고 빼뜨기로 되돌아와 끈을 만듭니다. 목 뒤에서 묶습니다."),
  ],
  // ---- 10종 더 (a bag's handle part is its last: the 가장자리 choice sits under it)
  knotbag: [
    { key: "fold", title: "판", sub: "한 장을 떠서 반 접습니다", fields: [F("a", "너비", 14, 36, 24), F("h", "높이", 14, 34, 22)], help: "판 하나를 높이의 두 배로 떠서 반 접고 양 옆선을 잇습니다. 접힌 선이 바닥입니다.", sum: d => `${d.a} × ${d.h}cm · 반 접기` },
    { key: "knot", title: "손잡이", sub: "한쪽은 짧은 고리, 한쪽은 긴 끈", fields: [F("tieCm", "짧은 고리", 8, 24, 14, 1), F("strapCm", "긴 끈", 24, 60, 36, 1), F("handleWcm", "너비", 3, 8, 5)],
      help: "입구 양 끝의 몇 코를 각각 이어 떠서 고리와 끈을 만듭니다. 긴 끈을 짧은 고리에 끼워 손잡이로 씁니다.", sum: d => `고리 ${d.tieCm ?? 14}cm · 끈 ${d.strapCm ?? 36}cm · 너비 ${d.handleWcm ?? 5}cm` },
  ],
  coinbag: [
    { key: "box", title: "몸통", sub: "박스 바닥에서 올라가는 작은 통", fields: [F("a", "가로", 8, 16, 11), F("b", "너비 (두께)", 3, 8, 5), F("h", "높이", 6, 14, 9)], help: "네모 바닥을 둘레로 뜬 뒤 곧게 올라갑니다. 양 옆에는 체인을 걸 작은 고리가 하나씩 달립니다.", sum: d => `${d.a} × ${d.b} × ${d.h}cm · 체인 고리 2개` },
    { key: "tie", title: "손잡이", sub: "짧은 손잡이 둘", fields: [{ ...F("handleCm", "길이", 12, 30, 18, 1), set: (_d, v) => ({ handle: "short", handleCm: v, handleCount: 2 }) }], help: "사슬을 뜨고 짧은뜨기로 되돌아와 앞뒤에 하나씩 답니다.", sum: d => `2개 · ${d.handleCm ?? 18}cm` },
  ],
  traptote: [
    { key: "base", title: "바닥", sub: "좁은 바닥에서 시작합니다", fields: [F("a", "바닥 너비", 8, 26, 14), F("b", "바닥 폭", 4, 14, 8)], help: "네모 바닥을 둘레로 뜹니다.", sum: d => `${d.a} × ${d.b}cm` },
    { key: "slope", title: "몸통", sub: "단마다 고르게 늘려 넓어집니다", fields: [F("h", "높이", 12, 34, 20),
        { ...F("topA", "입구 너비", 10, 50, 26), get: d => d.topA ?? d.a, set: (d, v) => ({ topA: Math.max(d.a, v) }) },
        { ...F("topA", "옆 기울기", 0, 35, 17, 1, "°"), get: d => Math.round(Math.atan(Math.max(0, (d.topA ?? d.a) - d.a) / 2 / Math.max(1, d.h)) * 180 / Math.PI), set: (d, v) => ({ topA: Math.round((d.a + 2 * d.h * Math.tan(v * Math.PI / 180)) * 2) / 2 }) }],
      help: "입구 너비와 옆 기울기는 같은 것을 두 가지로 정하는 칸입니다. 하나를 움직이면 다른 하나가 따라옵니다.", sum: d => `높이 ${d.h}cm · 입구 ${d.topA ?? d.a}cm` },
    { key: "tie", title: "손잡이", sub: "짧은 손잡이 둘", fields: [{ ...F("handleCm", "길이", 24, 70, 40, 1), set: (_d, v) => ({ handle: "short", handleCm: v, handleCount: 2 }) }], help: "사슬을 뜨고 짧은뜨기로 되돌아와 앞뒤에 하나씩 답니다.", sum: d => `2개 · ${d.handleCm ?? 40}cm` },
  ],
  clutch: [
    { key: "tube", title: "몸통", sub: "사슬 양쪽을 둘러 뜬 납작한 통", fields: [F("a", "가로", 16, 34, 24), { ...F("h", "세로", 9, 20, 14), set: (d, v) => ({ h: v, flapCm: Math.round(v * (d.flapCm ?? d.h * .6) / Math.max(1, d.h) * 2) / 2 }) }], help: "시작 사슬 양쪽을 한 바퀴 떠서 바닥 너비 없이 곧게 올라갑니다.", sum: d => `${d.a} × ${d.h}cm` },
    { key: "fold", title: "덮개", sub: "뒤판을 길게 올려 앞으로 접습니다", fields: [{ ...F("flapCm", "몸통 높이의", 30, 100, 60, 5, "%"), get: d => Math.round((d.flapCm ?? d.h * .6) / Math.max(1, d.h) * 20) * 5, set: (d, v) => ({ closure: "flap", flapShape: "square", flapCm: Math.round(d.h * v / 100 * 2) / 2 }) }],
      help: "덮개 길이는 몸통 높이의 비율로 정합니다. 뒤판 마지막 단에서 그대로 이어 뜹니다.", sum: d => `${d.flapCm ?? Math.round(d.h * .6)}cm (몸통의 ${Math.round((d.flapCm ?? d.h * .6) / Math.max(1, d.h) * 100)}%)` },
    { key: "chain", title: "끈", sub: "체인 끈을 걸 수 있습니다", fields: [], picks: [{ label: "체인 끈", value: d => (d.chainLoops ? "on" : "off"), options: [["off", "없음", "손에 드는 클러치"], ["on", "체인 고리", "양 옆에 작은 고리"]], set: v => ({ chainLoops: v === "on" ? true : undefined }) }],
      help: "체인 고리를 고르면 입구 양 옆에 사슬 고리를 하나씩 달아 체인 끈을 겁니다.", sum: d => (d.chainLoops ? "체인 고리 2개" : "없음") },
  ],
  ringbag: [
    { key: "tube", title: "몸통", sub: "사슬 양쪽을 둘러 뜬 납작한 통", fields: [F("a", "가로", 18, 36, 26), F("h", "세로", 14, 30, 20)], help: "시작 사슬 양쪽을 한 바퀴 떠서 바닥 너비 없이 곧게 올라갑니다.", sum: d => `${d.a} × ${d.h}cm` },
    { key: "ring", title: "링", sub: "금속 링 2개가 손잡이입니다", fields: [F("ringCm", "링 지름", 8, 18, 12)], help: "입구에 짧은뜨기 한 단을 뜬 뒤, 앞쪽과 뒤쪽 가운데 코를 링을 감싸며 짧은뜨기로 붙입니다. 양 끝 몇 코는 옆트임으로 남깁니다.", sum: d => `지름 ${d.ringCm ?? 12}cm · 2개` },
  ],
  netbucket: [
    { key: "base", title: "바닥", sub: "여기서부터 뜹니다", fields: [F("a", "바닥 지름", 10, 24, 16)], help: "원형 바닥의 마지막 단을 그물의 코 단위에 맞춥니다.", sum: d => `원 지름 ${d.a}cm` },
    { key: "net", title: "그물", sub: "짧고 넓은 몸통", fields: [F("h", "높이", 8, 22, 14)], picks: [{ label: "구멍 크기", value: d => String(d.netCh ?? 5), options: [["3", "작게", "사슬 3코 아치"], ["5", "보통", "사슬 5코 아치"], ["7", "크게", "사슬 7코 아치"]], set: v => ({ netCh: Number(v) as 3 | 5 | 7, crochetChart: "net" }) }],
      help: "아치가 클수록 한 바퀴의 아치 수와 몸통 단 수가 줄어듭니다. 입구는 짧은뜨기로 정리합니다.", sum: d => `높이 ${d.h}cm · 사슬 ${d.netCh ?? 5}코 아치` },
    { key: "tie", title: "손잡이", sub: "위로 가로지르는 손잡이 하나", fields: [{ ...F("handleCm", "길이", 20, 50, 30, 1), set: (_d, v) => ({ handle: "short", handleCm: v, handleCount: 1 }) }], help: "사슬을 뜨고 짧은뜨기로 되돌아와 입구 양쪽에 연결합니다.", sum: d => `1개 · ${d.handleCm ?? 30}cm` },
  ],
  twoway: [
    { key: "two", title: "판", sub: "같은 판을 2장 뜹니다", fields: [F("a", "너비", 20, 40, 30), F("h", "높이", 18, 38, 28)], help: `입구에서 ${TWOWAY_EYE}cm 아래 단이 끈 구멍 단입니다. 두 판을 옆 · 바닥 · 옆으로 잇습니다.`, sum: d => `${d.a} × ${d.h}cm · 2장` },
    { key: "cord", title: "조임끈", sub: "조이면 복주머니, 펴면 토트", fields: [], picks: [{ label: "3D로 볼 모습", value: d => (d.cinched ? "in" : "out"), options: [["out", "편 모습", "토트"], ["in", "조인 모습", "복주머니"]], set: v => ({ cinched: v === "in" ? true : undefined }) }],
      help: "조임끈을 끈 구멍 단에 한 바퀴 꿰어 당기면 입구가 모입니다. 코 수는 두 모습이 같습니다.", sum: d => (d.cinched ? "조인 모습" : "편 모습") },
    { key: "tie", title: "손잡이", sub: "짧은 손잡이 둘", fields: [{ ...F("handleCm", "길이", 24, 60, 36, 1), set: (_d, v) => ({ handle: "short", handleCm: v }) }], help: "사슬을 뜨고 짧은뜨기로 되돌아와 판 위쪽에 하나씩 답니다.", sum: d => `2개 · ${d.handleCm ?? 36}cm` },
  ],
  balaclava: [
    { key: "head", title: "머리와 목", sub: "쓰는 사람의 치수입니다", fields: [F("circ", "머리둘레", 44, 64, WEAR_DEFAULT.circ), F("neckCm", "목둘레", 28, 46, 36), F("h", "목 높이", 4, 14, 8)],
      help: `목둘레보다 ${Math.round((BALA_NECK_EASE - 1) * 100)}% 넉넉한 원통으로 시작해, 한 단에서 머리둘레까지 늘립니다. 정수리는 단마다 6코씩 줄여 닫습니다.`, sum: d => `머리 ${d.circ ?? WEAR_DEFAULT.circ}cm · 목 ${d.neckCm ?? 36}cm · 목 높이 ${d.h}cm` },
    { key: "face", title: "얼굴 구멍", sub: "남겨 두고 사슬로 건넙니다", fields: [F("faceW", "구멍 너비", 10, 20, 14), F("faceH", "구멍 높이", 8, 18, 12)], help: "구멍 너비만큼의 코를 남기고 왕복으로 뜨다가, 구멍 높이에서 사슬로 건너 다시 둘레로 뜹니다.", sum: d => `${d.faceW ?? 14} × ${d.faceH ?? 12}cm` },
    { key: "ears", title: "귀 장식", sub: "정수리 양옆", fields: [], picks: [{ label: "귀 장식", value: d => (d.ears ? "on" : "off"), options: [["off", "없음"], ["on", "귀 달기", "작은 원 2장"]], set: v => ({ ears: v === "on" ? true : undefined }) }],
      help: "작은 원 두 장을 떠서 정수리 양옆에 세워 답니다.", sum: d => (d.ears ? "작은 원 2장" : "없음") },
  ],
  motifscarf: [
    { key: "line", title: "크기", sub: "모티프를 한 줄로 잇습니다", fields: [F("a", "폭 (모티프 한 변)", 8, 24, 14), F("b", "길이", 80, 220, 140, 5)], help: "모티프의 단 수는 폭에서, 장 수는 길이에서 나옵니다.", sum: d => `폭 ${d.a}cm · 길이 ${d.b}cm` },
    { key: "tone", title: "색 배치", sub: "두 번째 실 색을 씁니다", fields: [], picks: [{ label: "색 배치", value: d => d.motifColors ?? "one", options: [["one", "한 색"], ["alt", "번갈아", "한 장씩 두 색"], ["ring", "가운데와 테두리", "모티프 안에서 두 색"]], set: v => ({ motifColors: v === "one" ? undefined : (v as "alt" | "ring") }) }],
      help: "배색은 실 설정에서 더한 두 번째 색으로 보입니다. 없으면 바탕색을 한 톤 밝게 보여 드립니다.", sum: d => ({ alt: "번갈아 두 색", ring: "가운데와 테두리" } as Record<string, string>)[d.motifColors ?? ""] ?? "한 색" },
  ],
  bigsocks: [
    { key: "foot", title: "발", sub: "신는 사람의 치수입니다", fields: [F("footL", "발 길이", 18, 30, 24), F("ankleCm", "발목 둘레", 18, 34, 24)], help: `발끝에서 원형으로 시작해 발목 둘레보다 ${Math.round((SOCK_EASE - 1) * 100)}% 넉넉한 통이 되면, 늘리지 않고 발 길이만큼 뜹니다.`, sum: d => `발 길이 ${d.footL ?? 24}cm · 발목 ${d.ankleCm ?? 24}cm` },
    { key: "leg", title: "목", sub: "통을 그대로 올려 위를 접습니다", fields: [F("h", "목 높이", 8, 34, 16), F("cuffCm", "접는 단", 0, 8, 4)], help: "뒤꿈치 자리부터는 같은 코 수로 목을 올립니다. 한 단을 뒷고리에만 떠 접는 선을 만들고, 접는 단을 더 떠서 밖으로 접어 내립니다. 두 짝을 뜹니다.", sum: d => `높이 ${d.h}cm · 접는 단 ${d.cuffCm ?? 4}cm` },
  ],
  backpack: [
    { key: "base", title: "바닥", sub: "여기서부터 뜹니다", fields: [F("a", "바닥 지름", 14, 32, 22)], help: "원형 바닥에서 곧게 올라가는 원통입니다.", sum: d => `원 지름 ${d.a}cm` },
    { key: "tube", title: "몸통", sub: "입구 아래에 끈 구멍 단이 들어갑니다", fields: [F("h", "높이", 18, 45, 30)], help: "입구 바로 아래 단에 사슬 1코씩 띄워 끈 구멍을 만듭니다.", sum: d => `높이 ${d.h}cm · 끈 구멍 단` },
    { key: "tie", title: "끈", sub: "끈 하나가 입구를 조이고 어깨끈이 됩니다", fields: [F("tieCm", "어깨끈 길이", 40, 110, 70, 1)], help: "끈을 끈 구멍 단에 한 바퀴 꿰어, 양 끝을 바닥 양옆의 고리에 하나씩 묶습니다.", sum: d => `어깨끈 ${d.tieCm ?? 70}cm × 2 · 아래 고리 2개` },
  ],
};
