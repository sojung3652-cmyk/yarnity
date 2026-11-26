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
    case "motifhat": { const M = motifHat(p, g); return `모티프 하나는 ${M.R}단, 한 변 ${M.E}코(${fmt(M.sizeCm)}cm)입니다. 옆 ${M.n}장의 둘레는 ${fmt(M.roundCm)}cm, 정수리는 ${M.Rc}단, 챙은 ${M.Rb}단짜리 ${M.n}장입니다.`; }
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
