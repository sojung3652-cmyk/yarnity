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
import type { Draft } from "./types";

const rnd = (x: number) => Math.round(+x.toFixed(6));
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const SC = "짧은뜨기", DC = "한길긴뜨기";
const mm = (v: number) => fmt(v * 10);
const pos = (v: number | null | undefined, d: number) => (v != null && v > 0 ? v : d);

export type WearId = "buckethat" | "motifhat" | "hoodscarf" | "earflap" | "kerchief";
export const WEAR_IDS: WearId[] = ["buckethat", "motifhat", "hoodscarf", "earflap", "kerchief"];
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

/** the line the screen shows under a wear piece's sizes */
export function wearNote(p: PlanInput, g: Gauge, g0: Gauge = g): string {
  switch (p.item) {
    case "buckethat": { const H = bucketHat(p, g); return `정수리를 ${H.R}단 동안 늘려 한 바퀴 ${H.N}코(${fmt(H.N * g.w)}cm)가 되면, 늘림 없이 ${H.S}단을 내려 뜹니다.` + (H.B ? ` 챙은 ${H.B}단, 마지막 단 ${H.counts[H.B - 1]}코입니다.` : ""); }
    case "motifhat": { const M = motifHat(p, g); return `모티프 하나는 ${M.R}단, 한 변 ${M.E}코(${fmt(M.sizeCm)}cm)입니다. 옆 ${M.n}장의 둘레는 ${fmt(M.roundCm)}cm(머리둘레 ${M.circ}cm), 정수리는 ${M.Rc}단, 챙은 ${M.Rb}단짜리 ${M.n}장입니다.`; }
    case "hoodscarf": { const H = hoodScarf(p, g); return `정수리를 ${H.R}단 동안 늘려 ${H.N}코, 그 가운데 ${H.W}코로 ${H.H}단을 왕복해 내려 뜹니다. 양 끝 ${H.T}코씩 ${H.PR}단이 스카프 끈입니다.`; }
    case "earflap": { const H = earflap(p, g); return `사슬 ${H.W}코로 시작해 ${H.R}단을 내려 뜨고, 양 끝 ${H.T}코씩 ${H.PR}단이 귀덮개입니다. 반 접어 위 ${H.J}코를 잇습니다.`; }
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
export interface KitField { key: keyof Draft; label: string; min: number; max: number; step: number; def: number; unit: string; set?: (d: Draft, v: number) => Partial<Draft> }
/** a choice among a few (tiles): what is picked now, the choices [value, name, a line], what picking one sets */
export interface KitPick { label: string; value: (d: Draft) => string; options: [string, string, string?][]; set: (v: string) => Partial<Draft> }
/** a part of a starter as 조립하기 shows it: its tab, its heading, its sliders and choices, a line of help, and
 *  how "지금 조립된 것" says it */
export interface KitPart { key: string; title: string; sub: string; fields: KitField[]; picks?: KitPick[]; help: string; sum: (d: Draft) => string }
const F = (key: keyof Draft, label: string, min: number, max: number, def: number, step = .5, unit = "cm"): KitField => ({ key, label, min, max, step, def, unit });
const val = (d: Draft, f: KitField) => { const v = d[f.key]; return typeof v === "number" && Number.isFinite(v) ? v : f.def; };
/** a field's value now (the size it starts from while none is set), inside its range */
export const kitValue = (d: Draft, f: KitField) => clamp(val(d, f), f.min, f.max);
const head = (hh?: KitField): KitPart => ({ key: "head", title: "머리", sub: "쓰는 사람의 치수입니다", fields: [F("circ", "머리둘레", 44, 64, WEAR_DEFAULT.circ), ...(hh ? [hh] : [])], help: "",
  sum: d => `둘레 ${val(d, F("circ", "", 0, 0, WEAR_DEFAULT.circ))}cm` + (hh ? ` · ${hh.label} ${val(d, hh)}cm` : "") });
const ties = (title: string, sub: string, len: KitField, wid: KitField | null, help: string): KitPart => ({ key: "tie", title, sub, fields: wid ? [len, wid] : [len], help, sum: d => `길이 ${val(d, len)}cm` + (wid ? ` · 너비 ${val(d, wid)}cm` : "") });
/** a starter's size as a line (확인, 도안 보기): the head's round, a bottle's sizes - not a bottom's diameter. Null: not one of these. */
export function kitSize(d: { item?: string; free?: unknown; paint?: unknown }): string | null {
  const k = !d.free && !d.paint && d.item ? KITS[d.item] : undefined; if (!k) return null;
  const dd = d as Draft;
  return d.item === "backpack" ? `바닥 지름 ${dd.a}cm · 높이 ${dd.h}cm` : d.item === "bottlebag" ? `병 ${k[0].sum(dd)}` : `머리${k[0].sum(dd)}`;
}
export const KITS: Record<string, KitPart[]> = {
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
  backpack: [
    { key: "base", title: "바닥", sub: "여기서부터 뜹니다", fields: [F("a", "바닥 지름", 14, 32, 22)], help: "원형 바닥에서 곧게 올라가는 원통입니다.", sum: d => `원 지름 ${d.a}cm` },
    { key: "tube", title: "몸통", sub: "입구 아래에 끈 구멍 단이 들어갑니다", fields: [F("h", "높이", 18, 45, 30)], help: "입구 바로 아래 단에 사슬 1코씩 띄워 끈 구멍을 만듭니다.", sum: d => `높이 ${d.h}cm · 끈 구멍 단` },
    { key: "tie", title: "끈", sub: "끈 하나가 입구를 조이고 어깨끈이 됩니다", fields: [F("tieCm", "어깨끈 길이", 40, 110, 70, 1)], help: "끈을 끈 구멍 단에 한 바퀴 꿰어, 양 끝을 바닥 양옆의 고리에 하나씩 묶습니다.", sum: d => `어깨끈 ${d.tieCm ?? 70}cm × 2 · 아래 고리 2개` },
  ],
};
