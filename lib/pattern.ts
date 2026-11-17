// Stitch / row calculation engine. Pure functions, no DOM.
// Ported 1:1 from the prototype (legacy/index.html, "ENGINE" section).
// tests/pattern.test.ts checks every output against a verbatim copy of the original,
// so keep the arithmetic (including rnd()'s toFixed(6) rounding) exactly as is.

export type HookKey = "2호" | "3호" | "4호" | "5호" | "6호" | "7호" | "8호" | "10호";
export type Weight = "thin" | "medium" | "thick";
export type Shape = "circle" | "oval" | "rect";
/** The engine path: "coaster" = round/oval/rect bottom only, "bag" = bottom + body (+ rim, handle),
 *  "rows" = a flat piece worked back and forth, "tube" = a ring worked in the round without a bottom.
 *  (The 19 items in lib/items.ts map onto these four.) */
export type ObjectKind = "coaster" | "bag" | "rows" | "tube";
export type Handle = "short" | "long" | "none";
export type Part = "bottom" | "body" | "rim" | "flap" | "handle" | "start" | "rows" | "rounds";

export const HOOKS: [HookKey, number][] = [["2호", 2.0], ["3호", 2.3], ["4호", 2.5], ["5호", 3.0], ["6호", 3.5], ["7호", 4.0], ["8호", 5.0], ["10호", 6.0]];
export const HOOK_MM: Record<string, number> = Object.fromEntries(HOOKS);
export const YARN: Record<Weight, number> = { thin: 0.9, medium: 1.0, thick: 1.15 };
export const YARN_KO: Record<Weight, string> = { thin: "가는 실", medium: "보통", thick: "굵은 실" };
export const SHAPE_KO: Record<Shape, string> = { circle: "원형", oval: "타원", rect: "사각" };
export const PART_KO: Record<Part, string> = { bottom: "바닥", body: "몸통", rim: "테두리", flap: "덮개", handle: "손잡이", start: "시작 사슬", rows: "왕복뜨기", rounds: "둘레뜨기" };

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
  measuredH?: number | null; // stitch height from the 3rd-round measurement (cm)
  measuredW?: number | null; // stitch width from the 5-row measurement (rows / tube only, cm)
}

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
}

export interface Plan {
  g: Gauge;
  c: number;
  rows: Row[];
  bottomRounds: number;
  bodyRows: number;
  last: number;
}

type RawRow = Omit<Row, "idx" | "label">;

export function gauge(p: PlanInput): Gauge {
  if (p.measuredH) return { h: p.measuredH, w: p.measuredH * 0.95, measured: true };
  const h = (p.hookMm || HOOK_MM[p.hook] || 3) * 0.2 * (YARN[p.weight as Weight] || 1);
  return { h, w: h * 0.95, measured: false };
}

export function planBottom(p: PlanInput, g: Gauge): { rows: RawRow[]; c: number } {
  const rows: RawRow[] = [];
  if (p.shape === "circle") {
    const R = Math.max(3, rnd((p.a / 2) / g.h));
    for (let r = 1; r <= R; r++) {
      const n = 6 * r, prev = 6 * (r - 1);
      let how: string;
      if (r === 1) how = "매직링에 짧은뜨기 6코";
      else if (r === 2) how = "모든 코에 늘림";
      else if (r % 2 === 0 || r < 4) how = `(짧은뜨기 ${r - 2}, 늘림 1) × 6`;
      else { const k = Math.floor((r - 2) / 2); how = `짧은뜨기 ${k}, (늘림 1, 짧은뜨기 ${r - 2}) × 5, 늘림 1, 짧은뜨기 ${r - 2 - k}`; }
      rows.push({ part: "bottom", n, how, why: r === 1 ? "시작" : `${prev} + 늘림 6 = ${n}${r >= 4 && r % 2 ? " · 늘림 자리를 반 칸 밀어 둥글게" : ""}`, inc: r === 1 ? 0 : 6 });
    }
    return { rows, c: 0 };
  }
  const b = p.b as number;
  const straight = Math.max(g.w * 2, p.a - b);
  const c = Math.max(3, rnd(straight / g.w) + 1);
  const R = Math.max(3, rnd((b / 2) / g.h));
  const per = p.shape === "oval" ? 6 : 8;
  for (let r = 1; r <= R; r++) {
    const n = 2 * (c - 1) + 6 + per * (r - 1);
    const prev = r === 1 ? 0 : n - per;
    let how: string;
    if (r === 1) how = `사슬 ${c}코, 둘째 코부터 짧은뜨기 ${c - 2}코 · 끝 코에 3코 · 반대편 짧은뜨기 ${c - 2}코 · 끝 코에 3코`;
    else if (p.shape === "oval") how = "직선은 그대로, 양 끝 반원에서 3번씩 늘림";
    else how = "직선은 그대로, 네 모서리 코마다 3코 뜨기";
    rows.push({ part: "bottom", n, how, why: r === 1 ? `사슬 ${c}코 기초 → ${n}코` : `${prev} + 늘림 ${per} = ${n}`, inc: r === 1 ? 0 : per });
  }
  return { rows, c };
}

export function plan(p: PlanInput): Plan {
  if (p.object === "rows") return planRows(p);
  if (p.object === "tube") return planTube(p);
  const g = gauge(p);
  const { rows: bottom, c } = planBottom(p, g);
  const last = bottom[bottom.length - 1].n;
  const rows = bottom.slice() as Row[];
  if (p.object === "bag") {
    const bodyRows = Math.max(2, rnd((p.h as number) / g.h));
    // the opening's stitches: the bottom's last round scaled by the perimeter (circle: diameter ratio;
    // oval / rect: length and width both grow by topA - a, perimeter ~ 2 (a - b) + pi b)
    const b0 = (p.b as number) || p.a;
    const top = p.topA && p.topA > p.a
      ? Math.round(last * (p.shape === "circle" ? p.topA / p.a : (2 * (p.a - b0) + Math.PI * (b0 + p.topA - p.a)) / (2 * (p.a - b0) + Math.PI * b0)))
      : last;
    let prevN = last;
    for (let i = 0; i < bodyRows; i++) {
      if (top === last) { rows.push({ part: "body", n: last, how: `늘림 없이 짧은뜨기 ${last}코`, why: i === 0 ? "여기서부터 위로 올라가요" : `${last}코 그대로`, inc: 0 } as Row); continue; }
      // widening body: the extra stitches spread evenly over the rows (round 1 of the body stays straight)
      const n = i === 0 ? last : Math.round(last + (top - last) * i / (bodyRows - 1)), inc = n - prevN;
      rows.push({ part: "body", n, how: inc ? `짧은뜨기 ${n}코 (늘림 ${inc}코를 고르게 나눠서)` : `늘림 없이 짧은뜨기 ${n}코`,
        why: i === 0 ? "여기서부터 위로 올라가요" : inc ? `${prevN} + 늘림 ${inc} = ${n} · 위로 갈수록 넓어져요` : `${n}코 그대로`, inc } as Row);
      prevN = n;
    }
    const rimN = prevN;
    for (let i = 0; i < 2; i++) rows.push({ part: "rim", n: rimN, how: i === 0 ? `짧은뜨기 ${rimN}코` : `빼뜨기 ${rimN}코로 마무리`, why: "입구를 단단하게", inc: 0 } as Row);
    if (p.flapCm && p.flapCm > 0) {
      const fn = Math.max(4, Math.round(rimN / 2) - 2), fr = Math.max(2, rnd(p.flapCm / g.h));
      for (let i = 0; i < fr; i++) rows.push({ part: "flap", n: fn, how: i === 0 ? `뒤판 가운데 ${fn}코에 실을 걸고 짧은뜨기 ${fn}코` : i === fr - 1 ? `사슬 1, 뒤집어서 짧은뜨기 ${fn}코 · 가운데에 사슬 고리(단추 구멍)` : `사슬 1, 뒤집어서 짧은뜨기 ${fn}코`,
        why: i === 0 ? `입구의 절반 ${Math.round(rimN / 2)}코 - 양옆 1코씩 · 덮개 ${p.flapCm}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${fr}단` : `${fn}코 그대로`, inc: 0 } as Row);
    }
    if (p.handle !== "none") {
      const len = p.handleCm && p.handleCm > 0 ? p.handleCm : p.handle === "long" ? 90 : 25, ch = rnd(len / (g.w * 0.85));
      for (let i = 0; i < 2; i++) rows.push({ part: "handle", n: ch, how: `사슬 ${ch}코 (약 ${len}cm), 짧은뜨기로 되돌아 뜨고 양쪽에 연결`, why: `${len}cm ÷ 사슬 한 코 ${fmt(g.w * 0.85 * 10)}mm`, inc: 0 } as Row);
    }
  }
  let bi = 0, bo = 0, ri = 0, fl = 0, ha = 0;
  rows.forEach((r, i) => {
    r.idx = i;
    if (r.part === "bottom") { r.no = ++bi; r.label = `${bi}단`; }
    else if (r.part === "body") r.label = `${bottom.length + (++bo)}단`;
    else if (r.part === "rim") r.label = `테두리 ${++ri}`;
    else if (r.part === "flap") r.label = `덮개 ${++fl}`;
    else r.label = `손잡이 ${++ha}`;
  });
  return { g, c, rows, bottomRounds: bottom.length, bodyRows: rows.filter(r => r.part === "body").length, last };
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
    if (inc) {
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
  const n = Math.max(2, rnd(p.a / g0.w)), R = Math.max(2, rnd((p.b as number) / g.h));
  const rows = [{ part: "start", n: n + 1, how: `사슬 ${n + 1}코`, why: `폭 ${p.a}cm ÷ 코 너비 ${fmt(g0.w * 10)}mm = ${n}코, 기둥 사슬 1코 더`, inc: 0 }] as Row[];
  rows.push({ part: "rows", n, how: `두 번째 사슬부터 짧은뜨기 ${n}코`, why: "첫 단", inc: 0 } as Row);
  for (let r = 2; r <= R; r++) rows.push({ part: "rows", n, how: `사슬 1, 뒤집어서 짧은뜨기 ${n}코`, why: r === 2 ? `길이 ${p.b}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${R}단` : `${n}코 그대로`, inc: 0 } as Row);
  labelFlat(rows);
  return { g, c: n + 1, rows, bottomRounds: 0, bodyRows: R, last: n };
}

/** Tube without a bottom, in the round. a = circumference, h = height (cm).
 *  start chain = round(circumference / stitch width), joined with a slip stitch;
 *  rounds = round(height / stitch height); no increases. */
export function planTube(p: PlanInput): Plan {
  const g0 = gauge({ ...p, measuredH: null }), g = p.measuredH ? { ...gauge(p), w: p.measuredW || g0.w } : g0;
  const n = Math.max(6, rnd(p.a / g0.w)), R = Math.max(2, rnd((p.h as number) / g.h));
  const rows = [{ part: "start", n, how: `사슬 ${n}코, 꼬이지 않게 빼뜨기로 고리 연결`, why: `둘레 ${p.a}cm ÷ 코 너비 ${fmt(g0.w * 10)}mm = ${n}코`, inc: 0 }] as Row[];
  for (let r = 1; r <= R; r++) rows.push({ part: "rounds", n, how: `짧은뜨기 ${n}코, 첫 코에 빼뜨기`, why: r === 1 ? `높이 ${p.h}cm ÷ 코 높이 ${fmt(g.h * 10)}mm = ${R}단` : `${n}코 그대로`, inc: 0 } as Row);
  labelFlat(rows);
  return { g, c: n, rows, bottomRounds: 0, bodyRows: R, last: n };
}

// ---- 기둥사슬 (standing / turning chain) in the instructions ----
// Every row and round here is single crochet, so each starts with 1 chain up to the stitch height - the
// 기둥사슬 - which is not counted as a stitch (for 한길긴뜨기 and taller it would be 3+ and count as the
// first stitch). Rounds are joined: 기둥사슬 1 at the start, a slip stitch into the first stitch at the end
// (a slip stitch has no height, so the rim's slip-stitch round needs no 기둥사슬). Rows turn after it.
// The engine above stays as the prototype had it (tests/pattern.test.ts checks it against the original);
// this only rewrites the text the pattern and the knitting screen show, and marks the rows that have one
// (`turn`, the chains: drawn on the chart).
export const TURN_CH = 1;
export function withChains(pp: Plan): Plan {
  const rows = pp.rows.map((r): Row & { turn?: number } => {
    const round = r.part === "bottom" || r.part === "body" || (r.part === "rim" && !r.how.startsWith("빼뜨기"));
    if (round) {
      if (r.how.startsWith("매직링에 ")) return { ...r, how: `매직링에 기둥사슬 ${TURN_CH}, ${r.how.slice(5)}, 첫 코에 빼뜨기`, turn: TURN_CH };
      if (r.how.startsWith("사슬 ")) return { ...r, how: `${r.how} · 첫 코에 빼뜨기로 연결`, turn: 0 }; // oval / rect round 1: the chain's first stitch stands in
      return { ...r, how: `기둥사슬 ${TURN_CH}, ${r.how}, 첫 코에 빼뜨기`, turn: TURN_CH };
    }
    if (r.part === "rounds") return { ...r, how: `기둥사슬 ${TURN_CH}, ${r.how}`, turn: TURN_CH };
    if ((r.part === "rows" || r.part === "flap") && r.how.startsWith("사슬 1, 뒤집어서")) return { ...r, how: r.how.replace("사슬 1, 뒤집어서", `기둥사슬 ${TURN_CH}, 뒤집어서`), turn: TURN_CH };
    if (r.part === "rows" && r.how.startsWith("두 번째 사슬부터")) return { ...r, how: r.how.replace("두 번째 사슬부터", "두 번째 사슬부터 (첫 사슬이 기둥사슬)"), turn: TURN_CH };
    if (r.part === "start" && r.how.endsWith("고리 연결")) return r;
    return r;
  });
  return { ...pp, rows };
}
