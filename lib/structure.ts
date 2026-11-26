// 구조 부품 (Kim: 실제 뜨개 작품들에서 배운 구조 원리로 조립하기 부품을 늘리기): pieces that are not a bottom
// worked round with a wall on it -
//   판 2장 + 띠     two flat panels the same, and one long strip that is the sides and the bottom between them
//                   (and, when asked, goes on as the handle)
//   판 하나 호보     a panel worked back and forth from a chain, its lower corners rounded by increases at the two
//                   edges only, then straight; the few stitches at each end go on up alone as two posts whose
//                   ends are joined: the strap
//   사선 / 삼각형    a flat piece (or a flap) that loses stitches at one edge row after row (a slant) or at both
//                   (a triangle), down to a few stitches that can go on as a cord
// Only the principles are taken from made pieces. Every number is the gauge's (lib/pattern gauge): a width or a
// length over a stitch's width, a height or a strip's length over a row's height. The 3D, the words and the
// symbol chart all read these rows, so their counts are the same counts.
import type { Gauge, Plan, PlanInput, Row } from "./pattern";

const rnd = (x: number) => Math.round(+x.toFixed(6));
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const SC = "짧은뜨기", CRAB = "되돌아짧은뜨기";

// ---------------------------------------------------------------- 사선과 삼각형
export type TaperSide = "left" | "right" | "both";
export interface Taper {
  /** stitches lost at the left and at the right edge in each row (row 1 loses none) */
  rows: [number, number][];
  /** the stitches of each row */
  counts: number[];
  tip: number;
  /** the rule in words: one stitch at an edge every `every` rows, or `by` stitches at an edge every row */
  every: number; by: number;
}
/** `n0` stitches over `R` rows down to `tip` at one edge (a slant) or both (a triangle). What an edge loses in
 *  all is spread evenly over the rows after the first: by row r it has lost round(e x (r - 1) / (R - 1)).
 *  Both edges: the piece keeps its middle, so what is lost is even (the tip takes a stitch more when it is not).
 *  The rule: every floor((R - 1) / e) rows one stitch, or - more to lose than rows - ceil(e / (R - 1)) a row. */
export function taper(n0: number, R: number, side: TaperSide, tipWant = 1): Taper {
  const both = side === "both"; let tip = clamp(Math.round(tipWant) || 1, 1, Math.max(1, n0 - 1));
  if (both && (n0 - tip) % 2) tip = tip + 1 <= n0 - 1 ? tip + 1 : tip - 1;
  const e = both ? (n0 - tip) / 2 : n0 - tip, steps = Math.max(1, R - 1);
  const rows: [number, number][] = [[0, 0]], counts = [n0]; let lost = 0;
  for (let r = 1; r < R; r++) {
    const now = Math.round(e * r / steps), d = now - lost; lost = now;
    rows.push([side === "right" ? 0 : d, side === "left" ? 0 : d]);
    counts.push(n0 - (both ? 2 : 1) * lost);
  }
  return { rows, counts, tip: counts[counts.length - 1], every: e > 0 && e <= steps ? Math.floor(steps / e) : 1, by: e > steps ? Math.ceil(e / steps) : 1 };
}
/** the rule as the screen says it */
export function taperNote(n0: number, t: Taper, side: TaperSide): string {
  const where = side === "both" ? "양 끝에서" : side === "left" ? "왼쪽 끝에서" : "오른쪽 끝에서";
  if (t.tip === n0) return `${n0}코 그대로입니다.`;
  // how often, as it truly comes out: one stitch every k rows when that divides, else its average
  const e = (n0 - t.tip) / (side === "both" ? 2 : 1), steps = Math.max(1, t.counts.length - 1), per = steps / e;
  const rule = e > steps ? `단마다 ${where} 약 ${fmt(e / steps)}코씩` : Number.isInteger(per) ? `${per > 1 ? `${per}단마다` : "단마다"} ${where} 1코씩` : `약 ${fmt(per)}단마다 ${where} 1코씩 (${steps}단 가운데 ${e}단)`;
  return `${n0}코에서 ${t.tip}코까지: ${rule}, 모두 ${t.counts.length}단입니다.`;
}
/** A row that loses `dl` stitches at the piece's left edge and `dr` at its right. Rows turn: an odd row (the
 *  first is 1) is worked from the right edge to the left, an even one back - so the left edge is an odd row's
 *  end and an even row's start. */
export const taperEnds = (r: number, dl: number, dr: number): [number, number] => (r % 2 ? [dr, dl] : [dl, dr]);
function taperHow(r: number, n: number, dl: number, dr: number): string {
  const [first, last] = taperEnds(r, dl, dr), tog = (k: number) => (k > 1 ? `${SC} 2코 모아뜨기 ${k}번` : `${SC} 2코 모아뜨기`), mid = n - first - last;
  return ["사슬 1, 뒤집어서", [first ? tog(first) : "", mid > 0 ? `${SC} ${mid}코` : "", last ? tog(last) : ""].filter(Boolean).join(", ")].join(" ");
}
const taperWhy = (prev: number, n: number, dl: number, dr: number) => !dl && !dr ? `${n}코 그대로` : `${prev} - 줄임 ${dl + dr} = ${n} · ${dl && dr ? "양 끝에서" : dl ? "왼쪽 끝에서" : "오른쪽 끝에서"}`;

/** the cord a tip goes on as: its stitches kept, row after row, as long as asked */
function cordRows(tip: number, cm: number, g: Gauge, label: (k: number) => string): Row[] {
  const R = Math.max(2, rnd(cm / g.h));
  return Array.from({ length: R }, (_, i) => ({ part: "strap", n: tip, own: true, inc: 0, label: label(i + 1),
    how: `기둥사슬 1, 뒤집어서 ${SC} ${tip}코`, why: i === 0 ? `남긴 ${tip}코 그대로 · 끈 ${fmt(cm)}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${R}단` : `${tip}코 그대로` } as Row));
}

/** A flat piece worked back and forth that slants or comes to a point. a = its width at the start, b = its
 *  length (cm). */
export function planTaper(p: PlanInput, g: Gauge, g0: Gauge): Plan {
  const n0 = Math.max(2, rnd(p.a / g0.w)), R = Math.max(2, rnd((p.b as number) / g.h)), side = p.taper as TaperSide, t = taper(n0, R, side, p.taperTip ?? 1);
  const rows = [{ part: "start", n: n0 + 1, how: `사슬 ${n0 + 1}코`, why: `폭 ${p.a}cm ÷ 코 너비 ${fmt(g0.w * 10)}mm = ${n0}코, 기둥 사슬 1코 더`, inc: 0 }] as Row[];
  rows.push({ part: "rows", n: n0, how: `두 번째 사슬부터 ${SC} ${n0}코`, why: `첫 단 · 길이 ${p.b}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${R}단 · ${taperNote(n0, t, side)}`, inc: 0, edge: [0, 0] } as Row);
  for (let r = 2; r <= R; r++) {
    const [dl, dr] = t.rows[r - 1], n = t.counts[r - 1];
    rows.push({ part: "rows", n, how: taperHow(r, n, dl, dr), why: taperWhy(t.counts[r - 2], n, dl, dr), inc: -(dl + dr), edge: [-dl, -dr], work: taperEnds(r, dl, dr) } as Row);
  }
  let k = 0; rows.forEach((r, i) => { r.idx = i; if (r.part === "start") r.label = "시작 사슬"; else { r.no = ++k; r.label = `${k}단`; } });
  if (p.taperCord) cordRows(t.tip, p.taperCordCm && p.taperCordCm > 0 ? p.taperCordCm : 20, g, i => `끈 ${i}단`).forEach(r => { r.idx = rows.length; r.edge = [0, 0]; rows.push(r); });
  return { g, c: n0 + 1, rows, bottomRounds: 0, bodyRows: R, last: t.tip };
}

/** A bag's flap that slants or comes to a point: `fn` stitches over `fr` rows (lib/pattern works both out). The
 *  rows as the flap's own, after its first (the one picked up from the back). */
export function taperFlap(fn: number, fr: number, side: TaperSide, tip: number | null | undefined, cord: { cm: number; g: Gauge } | null): { t: Taper; how: (i: number) => string; why: (i: number) => string; edge: (i: number) => [number, number]; work: (i: number) => [number, number]; cord: Row[] } {
  const t = taper(fn, fr, side, tip ?? 1);
  return { t,
    how: i => taperHow(i + 1, t.counts[i], t.rows[i][0], t.rows[i][1]),
    why: i => taperWhy(t.counts[i - 1], t.counts[i], t.rows[i][0], t.rows[i][1]),
    edge: i => [-t.rows[i][0], -t.rows[i][1]],
    work: i => taperEnds(i + 1, t.rows[i][0], t.rows[i][1]),
    cord: cord ? cordRows(t.tip, cord.cm, cord.g, i => `덮개 끈 ${i}단`).map(r => ({ ...r, edge: [0, 0] as [number, number] })) : [] };
}

// ---------------------------------------------------------------- a panel with rounded lower corners
/** A panel `a` wide and `h` tall whose two lower corners are rounded: the radius is `corner` (0 square .. 1 as
 *  round as it can be) of half its shorter side. Row r sits at (r + 1/2) x a row's height: while that is inside
 *  the corner's radius the row stops short of each edge by the corner's own curve - so the chain is the
 *  narrowest row, and the rows over it grow at the two edges only until the corners are turned. */
export function panelRows(p: Pick<PlanInput, "a" | "h" | "corner">, g: Gauge) {
  const W = Math.max(4, rnd(p.a / g.w)), R = Math.max(3, rnd(((p.h as number) || 0) / g.h)), rc = clamp(p.corner ?? 0, 0, 1) * Math.min(p.a, (p.h as number) || 0) / 2;
  const inset = (i: number) => { const y = (i + .5) * g.h; return y >= rc ? 0 : Math.min(Math.floor(W / 2) - 1, rnd((rc - Math.sqrt(Math.max(0, rc * rc - (rc - y) ** 2))) / g.w)); };
  const ins = Array.from({ length: R }, (_, i) => inset(i)), counts = ins.map(v => W - 2 * v), grow = ins.findIndex(v => v === 0);
  // the edge of the panel the strip (or the other panel) is joined to: a side, the bottom, a side, round the corners
  const side = Math.max(0, ((p.h as number) || 0) - rc), bottom = Math.max(0, p.a - 2 * rc), arc = Math.PI * rc / 2;
  return { W, R, rc, ins, counts, grow: grow < 0 ? R : grow, sideCm: side + arc / 2, bottomCm: bottom + arc, edgeCm: 2 * side + bottom + 2 * arc };
}
/** one panel's rows, written: the chain, the rows that round the corners, the straight rows */
function panelWrite(P: ReturnType<typeof panelRows>, g: Gauge, name: string, sizes: string, start: string | null): Row[] {
  const rows: Row[] = [], n0 = P.counts[0];
  if (!start) rows.push({ part: "panel", n: n0, own: true, inc: 0, label: `${name} 시작 사슬`, how: `사슬 ${n0}코`, edge: [0, 0],
    why: `${sizes} · 둥근 모서리 반지름 ${fmt(P.rc)}cm만큼 양 끝에서 ${P.ins[0]}코씩 뺀 ${n0}코로 시작합니다` } as Row);
  for (let i = 0; i < P.R; i++) {
    const n = P.counts[i], d = i ? P.ins[i - 1] - P.ins[i] : 0;
    const how = i === 0 ? (start ?? `기둥사슬 1, 사슬 ${n}코에 ${SC} ${n}코`)
      : d > 0 ? `기둥사슬 1, 뒤집어서 첫 코에 ${SC} ${d + 1}코, ${SC} ${P.counts[i - 1] - 2}코, 마지막 코에 ${SC} ${d + 1}코`
      : `기둥사슬 1, 뒤집어서 ${SC} ${n}코`;
    const why = i === 0 ? (start ? `앞판과 같은 ${n}코` : "첫 단") : d > 0 ? `${P.counts[i - 1]} + 늘림 ${2 * d} = ${n} · 양 끝 모서리에서만 늘립니다` : i === P.grow ? `모서리를 다 돌았습니다 · ${n}코 그대로 ${P.R}단까지` : `${n}코 그대로`;
    rows.push({ part: "panel", n, own: true, inc: 2 * d, label: `${name} ${i + 1}단`, how, why, edge: [d, d] } as Row);
  }
  return rows;
}
const number = (rows: Row[]) => { rows.forEach((r, i) => { r.idx = i; }); return rows; };

// ---------------------------------------------------------------- 판 2장 + 띠
/** Two panels and a strip. a x h = a panel (cm), `corner` its lower corners, `stripCm` the strip's width,
 *  `stripHandle` the strip going on as the handle (handleCm more, its ends joined into a ring).
 *    strip's stitches = its width / a stitch's width
 *    strip's rows     = (side + bottom + side round the corners [+ the handle]) / a row's height
 *    joining          = the same edge / a stitch's width, in 되돌아짧은뜨기 (crab stitch), each panel */
export function planPanels(p: PlanInput, g: Gauge): Plan {
  const P = panelRows(p, g), sizes = `판 ${p.a} × ${p.h}cm = ${P.W}코 × ${P.R}단`;
  const sw = p.stripCm && p.stripCm > 0 ? p.stripCm : 6, S = Math.max(2, rnd(sw / g.w));
  const ring = !!p.stripHandle && p.handle !== "none", hcm = ring ? (p.handleCm && p.handleCm > 0 ? p.handleCm : 50) : 0;
  const edgeRows = Math.max(3, rnd(P.edgeCm / g.h)), sideRows = clamp(rnd(P.sideCm / g.h), 1, Math.floor((edgeRows - 1) / 2)), bottomRows = edgeRows - 2 * sideRows;
  const handleRows = ring ? Math.max(2, rnd(hcm / g.h)) : 0, SR = edgeRows + handleRows, J = Math.max(3, rnd(P.edgeCm / g.w));
  const rows: Row[] = [...panelWrite(P, g, "앞판", sizes, null), ...panelWrite(P, g, "뒤판", sizes, null)];
  rows.push({ part: "strip", n: S, own: true, inc: 0, label: "띠 시작 사슬", how: `사슬 ${S}코`, edge: [0, 0], why: `띠 너비 ${fmt(sw)}cm ÷ 코 너비 ${fmt(g.w * 10)}mm = ${S}코` } as Row);
  for (let i = 0; i < SR; i++) rows.push({ part: "strip", n: S, own: true, inc: 0, label: `띠 ${i + 1}단`, edge: [0, 0],
    how: (i === 0 ? `기둥사슬 1, 사슬 ${S}코에 ${SC} ${S}코` : `기둥사슬 1, 뒤집어서 ${SC} ${S}코`) + (i === SR - 1 && ring ? " · 실을 길게 남기고 잘라 시작 사슬과 맞대고 감침질로 이어 고리로 만듭니다" : ""),
    why: i === 0 ? `띠 길이 = 옆 ${fmt(P.sideCm)} + 바닥 ${fmt(P.bottomCm)} + 옆 ${fmt(P.sideCm)}${ring ? ` + 손잡이 ${fmt(hcm)}` : ""} = ${fmt(P.edgeCm + hcm)}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${SR}단`
      : i === sideRows ? "여기서부터 바닥 자리입니다" : i === sideRows + bottomRows ? "여기서부터 반대쪽 옆 자리입니다" : i === edgeRows && ring ? "여기서부터 손잡이입니다" : `${S}코 그대로` } as Row);
  rows.push({ part: "join", n: 0, own: true, inc: 0, label: "잇기 준비", how: `잇기 전에 마커링으로 두 판의 옆면·바닥 위치를 먼저 맞춥니다. 띠의 ${sideRows}단째와 ${sideRows + bottomRows}단째에 마커링을 걸어 두 아래 모서리에 오게 합니다`,
    why: `옆 ${sideRows}단 + 바닥 ${bottomRows}단 + 옆 ${sideRows}단 = ${edgeRows}단이 판의 옆·바닥·옆을 따라갑니다` } as Row);
  for (const name of ["앞판", "뒤판"]) rows.push({ part: "join", n: J, own: true, inc: 0, label: `${name} 잇기`,
    how: `${name}과 띠의 가장자리를 겉이 밖으로 오게 맞대고, 두 겹을 함께 떠서 ${CRAB} ${J}코로 잇습니다 (왼쪽에서 오른쪽으로 되돌아가며)`,
    why: `옆 ${fmt(P.sideCm)} + 바닥 ${fmt(P.bottomCm)} + 옆 ${fmt(P.sideCm)} = ${fmt(P.edgeCm)}cm ÷ 코 너비 ${fmt(g.w * 10)}mm = ${J}코` } as Row);
  if (!ring && p.handle && p.handle !== "none") {
    const len = p.handleCm && p.handleCm > 0 ? p.handleCm : 45, ch = rnd(len / (g.w * 0.85));
    for (let i = 0; i < 2; i++) rows.push({ part: "handle", n: ch, inc: 0, label: `손잡이 ${i + 1}`, how: `사슬 ${ch}코 (약 ${len}cm), ${SC}로 되돌아 뜨고 판 위쪽 양 끝에 연결`, why: `${len}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm` } as Row);
  }
  return { g, c: P.counts[0], rows: number(rows), bottomRounds: 0, bodyRows: P.R, last: P.W };
}

// ---------------------------------------------------------------- 판 하나 호보 (끈 기둥)
/** A panel whose two ends go on up as posts. a x h = the panel, `corner` its lower corners, `postSt` a post's
 *  stitches, `strapCm` the strap (the two posts together). `hoboFold`: the back is worked from the other side
 *  of the same chain (one piece through the bottom: only the sides are joined); else two panels the same, joined
 *  down a side, along the bottom and up the other.
 *    post's rows = half the strap / a row's height
 *    joining     = the joined edge / a stitch's width, in 되돌아짧은뜨기 */
export function planHobo(p: PlanInput, g: Gauge): Plan {
  const P = panelRows(p, g), sizes = `판 ${p.a} × ${p.h}cm = ${P.W}코 × ${P.R}단`, fold = !!p.hoboFold;
  const post = clamp(Math.round(p.postSt ?? 5) || 5, 2, Math.max(2, Math.floor(P.W / 2) - 1)), cm = p.strapCm && p.strapCm > 0 ? p.strapCm : 60, PR = Math.max(2, rnd(cm / 2 / g.h)), mid = P.W - 2 * post;
  const rows: Row[] = [];
  for (const [k, name] of ["앞판", "뒤판"].entries()) {
    rows.push(...panelWrite(P, g, name, sizes, k && fold ? `시작 사슬의 반대쪽에 새 실을 걸어 기둥사슬 1, ${SC} ${P.counts[0]}코` : null));
    for (const q of [0, 1]) for (let i = 0; i < PR; i++) rows.push({ part: "strap", n: post, own: true, inc: 0, label: `${name} 기둥${q + 1} ${i + 1}단`, edge: [0, 0], post: q as 0 | 1,
      how: (i === 0 ? (q === 0 ? `기둥사슬 1, 뒤집어서 끝의 ${post}코에만 ${SC} ${post}코 (가운데 ${mid}코는 뜨지 않고 남깁니다)` : `반대쪽 끝 ${post}코에 새 실을 걸어 기둥사슬 1, ${SC} ${post}코`) : `기둥사슬 1, 뒤집어서 ${SC} ${post}코`)
        + (i === PR - 1 && q === 1 ? " · 두 기둥의 끝을 맞대고 감침질로 이어 끈으로 만듭니다" : ""),
      why: i === 0 && q === 0 ? `기둥 너비 ${post}코 · 끈 ${fmt(cm)}cm의 절반 ÷ 코 높이 ${fmt(g.h * 10)}mm = ${PR}단씩` : `${post}코 그대로` } as Row);
  }
  const sideJ = Math.max(2, rnd(P.sideCm / g.w)), J = fold ? 2 * sideJ : Math.max(3, rnd(P.edgeCm / g.w));
  rows.push({ part: "join", n: 0, own: true, inc: 0, label: "잇기 준비", how: `잇기 전에 마커링으로 두 판의 옆면·바닥 위치를 먼저 맞춥니다. 두 판의 ${P.grow}단째(모서리가 끝나는 단) 양 끝과 맨 윗단 양 끝을 마커링으로 맞물립니다`,
    why: fold ? "바닥은 같은 사슬에서 이어져 있어 옆만 잇습니다" : "옆 · 바닥 · 옆이 서로 어긋나지 않게 합니다" } as Row);
  rows.push({ part: "join", n: J, own: true, inc: 0, label: "판 잇기",
    how: fold ? `두 판을 겉이 밖으로 오게 맞대고 양 옆을 각각 ${CRAB} ${sideJ}코씩 잇습니다 (모두 ${J}코)` : `두 판을 겉이 밖으로 오게 맞대고 옆 · 바닥 · 옆을 따라 ${CRAB} ${J}코로 잇습니다 (왼쪽에서 오른쪽으로 되돌아가며)`,
    why: fold ? `옆 ${fmt(P.sideCm)}cm ÷ 코 너비 ${fmt(g.w * 10)}mm = ${sideJ}코, 양쪽` : `옆 ${fmt(P.sideCm)} + 바닥 ${fmt(P.bottomCm)} + 옆 ${fmt(P.sideCm)} = ${fmt(P.edgeCm)}cm ÷ 코 너비 ${fmt(g.w * 10)}mm = ${J}코` } as Row);
  return { g, c: P.counts[0], rows: number(rows), bottomRounds: 0, bodyRows: P.R, last: P.W };
}
/** the numbers the screen shows for a hobo panel */
export function hoboNote(p: PlanInput, g: Gauge): string {
  const P = panelRows(p, g), post = clamp(Math.round(p.postSt ?? 5) || 5, 2, Math.max(2, Math.floor(P.W / 2) - 1)), PR = Math.max(2, rnd((p.strapCm && p.strapCm > 0 ? p.strapCm : 60) / 2 / g.h));
  return `시작 사슬 ${P.counts[0]}코에서 ${P.grow ? `${P.grow}단 동안 양 모서리에서 늘려 ` : ""}${P.W}코, 그대로 ${P.R}단까지 뜹니다. 양 끝 ${post}코씩만 ${PR}단을 더 떠서 잇습니다.`;
}
/** the strip's length as the screen says it */
export function stripNote(p: PlanInput, g: Gauge): string {
  const P = panelRows(p, g), ring = !!p.stripHandle && p.handle !== "none", hcm = ring ? (p.handleCm && p.handleCm > 0 ? p.handleCm : 50) : 0, S = Math.max(2, rnd((p.stripCm && p.stripCm > 0 ? p.stripCm : 6) / g.w));
  const SR = Math.max(3, rnd(P.edgeCm / g.h)) + (ring ? Math.max(2, rnd(hcm / g.h)) : 0);
  return `띠 길이 = 옆 ${fmt(P.sideCm)} + 바닥 ${fmt(P.bottomCm)} + 옆 ${fmt(P.sideCm)}${ring ? ` + 손잡이 ${fmt(hcm)}` : ""} = ${fmt(P.edgeCm + hcm)}cm, ${S}코로 ${SR}단입니다.`;
}

// ---------------------------------------------------------------- a piece's rows on a grid
// ---------------------------------------------------------------- 골지 판 (옆으로 떠서 세로 골)
/** A panel worked sideways: its rows run up the panel's height, so a row's stitches are the height and the rows
 *  are the width - and worked in the back loop only, each row leaves a ridge that stands upright in the piece:
 *  ribs. a x h = the panel (cm).
 *    a row's stitches = the height / a stitch's width        rows = the width / a row's height
 *  The hand's hole (`holeW` wide, `holeH` tall, `m` stitches of the panel left over it): over the rows the hole
 *  is wide, the stitches below it and the stitches over it are worked apart (the ones over it with yarn of their
 *  own); the row after crosses the gap with as many chains as the hole is tall. Two panels the same, joined down
 *  a side, along the bottom and up the other in 되돌아짧은뜨기. */
export function ribbedPanel(p: Pick<PlanInput, "a" | "h" | "holeW" | "holeH">, g: Gauge) {
  const h = (p.h as number) || 0, S = Math.max(6, rnd(h / g.w)), R = Math.max(4, rnd(p.a / g.h));
  const hw = clamp(p.holeW ?? 10, 0, Math.max(0, p.a - 4)), hh = clamp(p.holeH ?? 3, 0, h / 2), on = hw >= 1 && hh >= .5 && S >= 8 && R >= 6;
  const hr = on ? clamp(rnd(hw / g.h), 2, R - 4) : 0, hs = on ? clamp(rnd(hh / g.w), 2, S - 4) : 0, m = on ? clamp(rnd(2.5 / g.w), 2, S - hs - 2) : 0;
  return { S, R, hr, hs, m, lower: S - hs - m, r1: on ? Math.floor((R - hr) / 2) : -1, on };
}
export function planRibbed(p: PlanInput, g: Gauge): Plan {
  const P = ribbedPanel(p, g), { S, R, hr, hs, m, lower, r1 } = P, rows: Row[] = [];
  for (const name of ["앞판", "뒤판"]) {
    rows.push({ part: "panel", n: S, own: true, inc: 0, label: `${name} 시작 사슬`, how: `사슬 ${S}코`, edge: [0, 0],
      why: `판 ${p.a} × ${p.h}cm를 옆으로 뜹니다: 높이 ${p.h}cm ÷ 코 너비 ${fmt(g.w * 10)}mm = ${S}코` } as Row);
    for (let i = 0; i < R; i++) {
      const hole = P.on && i >= r1 && i < r1 + hr, bridge = P.on && i === r1 + hr, n = hole ? lower + m : S;
      const how = i === 0 ? `기둥사슬 1, 사슬 ${S}코에 ${SC} ${S}코`
        : hole ? `기둥사슬 1, 뒤집어서 아래쪽 ${SC} ${lower}코 · 위쪽 ${SC} ${m}코` + (i === r1 ? ` (가운데 ${hs}코는 손잡이 구멍으로 비웁니다. 위쪽 ${m}코는 새 실로 따로 뜹니다)` : "")
        : bridge ? `기둥사슬 1, 뒤집어서 아래쪽 ${SC} ${lower}코, 사슬 ${hs}코로 구멍 위를 건너, 위쪽 ${SC} ${m}코`
        : `기둥사슬 1, 뒤집어서 ${SC} ${S}코`;
      const why = i === 0 ? `가로 ${p.a}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${R}단 · 뒤 고리에만 떠서 세로 골이 생깁니다`
        : i === r1 ? `구멍 너비 ${fmt(hr * g.h)}cm = ${hr}단 · 구멍 높이 ${fmt(hs * g.w)}cm = ${hs}코 · 그 위로 ${m}코를 남깁니다`
        : hole ? `${lower} + ${m} = ${n}코` : bridge ? `${lower} + 사슬 ${hs} + ${m} = ${S}코 · 구멍이 닫힙니다` : `${S}코 그대로`;
      rows.push({ part: "panel", n, own: true, inc: 0, label: `${name} ${i + 1}단`, how, why, edge: [0, 0], ...(hole ? { gap: [lower, hs, 0] } : bridge ? { gap: [lower, hs, 1] } : {}) } as Row);
    }
  }
  const J = Math.max(3, rnd((2 * ((p.h as number) || 0) + p.a) / g.w));
  rows.push({ part: "join", n: 0, own: true, inc: 0, label: "잇기 준비", how: "잇기 전에 마커링으로 두 판의 옆면·바닥 위치를 먼저 맞춥니다. 두 판의 골이 서로 마주 보게 겹치고 네 모서리를 마커링으로 맞물립니다",
    why: "손잡이 구멍이 있는 쪽이 위입니다. 위는 잇지 않습니다" } as Row);
  rows.push({ part: "join", n: J, own: true, inc: 0, label: "판 잇기", how: `두 판을 겉이 밖으로 오게 맞대고 옆 · 바닥 · 옆을 따라 ${CRAB} ${J}코로 잇습니다 (왼쪽에서 오른쪽으로 되돌아가며)`,
    why: `옆 ${p.h} + 바닥 ${p.a} + 옆 ${p.h} = ${fmt(2 * ((p.h as number) || 0) + p.a)}cm ÷ 코 너비 ${fmt(g.w * 10)}mm = ${J}코` } as Row);
  return { g, c: S, rows: number(rows), bottomRounds: 0, bodyRows: R, last: S };
}
/** the numbers the screen shows for a ribbed panel */
export function ribbedNote(p: PlanInput, g: Gauge): string {
  const P = ribbedPanel(p, g);
  return `사슬 ${P.S}코로 시작해 ${P.R}단을 옆으로 뜹니다.` + (P.on ? ` ${P.r1 + 1}단부터 ${P.hr}단 동안 가운데 ${P.hs}코를 비워 손잡이 구멍을 만듭니다.` : " 손잡이 구멍은 없습니다.");
}

/** which flat piece a row belongs to (null: not a row of one - joining, the last step, a bag's rounds) */
export const pieceOf = (r: Row): string | null =>
  r.part === "panel" || (r.part === "strap" && r.post != null) ? r.label.slice(0, 2)
  // (a top's two cups - lib/wear 뷔스티에 - are a piece each)
  : r.part === "flap" && /^컵\d/.test(r.label) ? r.label.slice(0, 2)
  : r.part === "strip" ? "띠" : r.part === "flap" || (r.part === "strap" && r.label.startsWith("덮개")) ? "덮개"
  : r.part === "rows" || r.part === "start" || r.part === "strap" ? "편물" : null;
/** a piece's base chain (drawn under its first row, never a row of the grid) */
export const isChainRow = (r: Row) => r.part === "start" || /시작 사슬$/.test(r.label);
/** The rows of one flat piece (no chain row) set where they lie: each row's left end and its stitches, on a grid
 *  as wide as the piece at its widest. A row that gains at its left edge starts that much further left, one that
 *  loses there further right (Row.edge); a hobo's two posts stand on the two ends of the panel's last row.
 *  `cells`: the grid, row-major from the bottom row, 0 a stitch and -1 nothing - what the 3D draws.
 *  The symbol chart and the 3D both read this, so a row has the same stitches in both. */
export function pieceLayout(rows: Row[]): { W: number; at: [number, number][]; cells: number[] } {
  const at: [number, number][] = []; let x = 0, body: [number, number] = [0, rows[0]?.n ?? 0];
  rows.forEach((r, i) => {
    if (r.post != null) { at.push([r.post === 0 ? body[0] + body[1] - r.n : body[0], r.n]); return; }
    if (i) x -= r.edge?.[0] ?? 0;
    // (a row with a hole in it - a ribbed panel's hand hole - is as long as its stitches and the gap together)
    const span = r.gap && !r.gap[2] ? r.n + r.gap[1] : r.n;
    at.push([x, span]); body = [x, span];
  });
  const min = Math.min(0, ...at.map(a => a[0])), W = Math.max(1, ...at.map(a => a[0] + a[1])) - min, cells = new Array<number>(W * rows.length).fill(-1);
  at.forEach((a, i) => { a[0] -= min; const gap = rows[i].gap; for (let k = 0; k < a[1]; k++) if (!(gap && !gap[2] && k >= gap[0] && k < gap[0] + gap[1])) cells[i * W + a[0] + k] = 0; });
  return { W, at, cells };
}
/** a hobo's two posts are worked one after the other but stand side by side: their rows share the grid's rows */
export function pieceRows(rows: Row[]): Row[][] {
  const out: Row[][] = []; let p0 = -1;
  for (const r of rows) {
    if (r.post === 0) { if (p0 < 0) p0 = out.length; out.push([r]); }
    else if (r.post === 1) { const k = out.filter((_, i) => i >= p0 && _.length === 2).length; (out[p0 + k] ?? (out[out.length] = [])).push(r); }
    else out.push([r]);
  }
  return out;
}

