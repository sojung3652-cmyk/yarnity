// Canvas renderers for the 따라 뜨기 stitch map, drawn as a crochet chart with the standard symbols
// (lib/stitchSymbols.ts): a magic ring or a chain base at the centre, single crochet (+) and increases (V)
// around it, each turned to grow outward; rows and tubes as rows of + with their chains / slip stitches.
// Browser-only: reads CSS colour tokens from :root.
import { CHART_MULT } from "./crochetChart";
import { dots, outline, paintMask, paintSize, type PaintShape, type Plan, type Row, type Shape } from "./pattern";
import { drawSym, type StitchSym } from "./stitchSymbols";
import { isChainRow, pieceLayout, pieceOf, pieceRows } from "./structure";
import type { Project } from "./types";

type St = "done" | "now" | "future";
const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/** "#rgb" / "#rrggbb" / "rgb(r, g, b)" -> [r, g, b] */
function rgbOf(c: string): [number, number, number] | null {
  const h = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (h) { const x = h[1].length === 3 ? h[1].replace(/./g, ch => ch + ch) : h[1]; return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)) as [number, number, number]; }
  const m = c.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i); return m ? [+m[1], +m[2], +m[3]] : null;
}
/** Done stitches: the yarn colour deepened with the ink (symbols are thin lines and must read on the cream
 *  paper), else --dot. */
function doneColor(color?: string) {
  const base = css("--dot"), a = color ? rgbOf(color) : null, ink = rgbOf("#6B5C55")!;
  if (!a) return base;
  return `rgb(${a.map((v, i) => Math.round(v * 0.6 + ink[i] * 0.4)).join(",")})`;
}
const colors = (color?: string): Record<St, string> => ({ done: doneColor(color), now: css("--dot-now"), future: css("--dot-future") });

function setup(cv: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), rect = cv.getBoundingClientRect();
  const W = Math.max(200, rect.width), H = Math.max(200, rect.height);
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext("2d")!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  return { ctx, W, H };
}

/** A round chart: round 1 is a magic ring (circle) or a chain base (oval / rect), then every stitch as + or
 *  V (increase), each turned to grow outward from the centre. Every round starts at the same place (outline
 *  t = 0). No 기둥사슬 or joining slip stitches are drawn (Kim's call: the chart shows the stitches only). */
export function drawMap(cv: HTMLCanvasElement, pp: Plan, shape: Shape, upto: number, stateOf: (r: number) => St, color?: string) {
  const { ctx, W, H } = setup(cv);
  const ds = dots(pp, shape, upto);
  let mx = 0, my = 0; ds.forEach(d => d.pts.forEach(p => { mx = Math.max(mx, Math.abs(p.x)); my = Math.max(my, Math.abs(p.y)); }));
  const pad = 40, sc = Math.min((W - pad * 2) / (2 * mx + pp.g.w), (H - pad * 2) / (2 * my + pp.g.w));
  const col = colors(color), cx = W / 2, cy = H / 2;
  // a symbol about as tall as the gap between rounds, never wider than the gap between stitches
  const size = Math.max(5, Math.min(18, pp.g.h * sc * 0.86, pp.g.w * sc * 1.25));
  const weight = size < 8 ? 1 : 1.3;

  // the centre: a magic ring, or the chain the oval / rect bottom starts from
  const st1 = stateOf(1);
  if (shape === "circle") drawSym(ctx, "ring", cx, cy, Math.max(6, pp.g.h * sc * 0.9), 0, col[st1], weight);
  // oval / rect: the chain the bottom starts from
  else { const n = pp.c - 1, gap = pp.g.w * sc; for (let k = 0; k < n; k++) drawSym(ctx, "ch", cx + (k - (n - 1) / 2) * gap, cy, Math.min(size, gap * 1.1), 0, col[st1], weight); }

  // where a round lies (outline t in 0..1) and which way is outward there
  const at = (r: number, t: number) => outline(shape, r, pp.g, pp.c).at(((t % 1) + 1) % 1);
  const outward = (r: number, t: number) => { const [ax, ay] = at(r, t - 0.002), [bx, by] = at(r, t + 0.002); return Math.atan2(by - ay, -(bx - ax)); };
  for (const d of ds) {
    const st = stateOf(d.r), n = d.pts.length;
    // the stitches, evenly round (the increases stay on their stitches)
    d.pts.forEach((p, i) => {
      const t = (i + 0.5) / n, [x, y] = at(d.r, t);
      drawSym(ctx, p.inc ? "inc" : "sc" as StitchSym, cx + x * sc, cy + y * sc, size, outward(d.r, t), col[st], weight);
    });
  }
  // 표기 (Kim): the rounds' numbers out along where every round starts, the start marked with the way the work goes
  if (ds.length) {
    const fam = getComputedStyle(document.body).fontFamily || "serif", fs = W < 430 ? 9.5 : 11, step = ds.length > 14 ? 2 : 1;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#5B4B45";
    ds.forEach((d, i) => { if (i % step && i !== ds.length - 1) return; const [x, y] = at(d.r, 0); ctx.font = `${stateOf(d.r) === "now" ? "600 " : ""}${fs}px ${fam}`; ctx.globalAlpha = stateOf(d.r) === "future" ? .5 : .9; ctx.fillText(String(d.r), cx + x * sc, cy + y * sc); });
    ctx.globalAlpha = 1;
    const last = ds[ds.length - 1], [x0, y0] = at(last.r, 0), [x1, y1] = at(last.r, .03), ox = cx + x0 * sc, oy = cy + y0 * sc, k = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / k, uy = (y1 - y0) / k, o = outward(last.r, 0), nx = Math.sin(o), ny = -Math.cos(o), bx = ox + nx * 20, by = oy + ny * 20;
    ctx.font = `${fs}px ${fam}`; ctx.fillText("시작", bx, by);
    ctx.strokeStyle = "#5B4B45"; ctx.lineWidth = 1.2; ctx.beginPath(); const sx = bx + ux * 18, sy = by + uy * 18, ex = sx + ux * 26, ey = sy + uy * 26; ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.moveTo(ex - ux * 7 - uy * 4, ey - uy * 7 + ux * 4); ctx.lineTo(ex, ey); ctx.lineTo(ex - ux * 7 + uy * 4, ey - uy * 7 - ux * 4); ctx.stroke();
    const fin = ds[ds.length - 1].pts.length; ctx.textAlign = "left"; ctx.globalAlpha = .9; ctx.fillText(`(총 ${fin}코)`, 10, H - 14); ctx.globalAlpha = 1;
  }
}

/** One round of a bag's stitch pattern in the side view (Kim: 반 무늬로 시작하는 단을 기호도안에도): the pattern's
 *  own symbols, a repeat at a time. A round that sits half a repeat over begins with half a pattern at the
 *  round's start (the left edge) and ends with the other half - the start itself never moves sideways.
 *  `n` stitches are shown across `bw`. False: a pattern drawn as plain stitches still (구멍뜨기, V 스티치). */
function drawWall(ctx: CanvasRenderingContext2D, w: NonNullable<Row["wall"]>, n: number, x0: number, bw: number, y: number, size: number, color: string, weight: number): boolean {
  const m = CHART_MULT[w.k][0], gap = bw / n, reps = Math.max(1, Math.floor(n / m)), half = w.i % 2 === 1, at = (s: number) => x0 + (s + .5) * gap;
  const sym = (s: "sc" | "ch" | "dc", x: number, yy = y, ang = 0, k = 1) => drawSym(ctx, s, x, yy, size * k, ang, color, weight);
  // a fan: `count` 한길긴뜨기 from one stitch, leaning from `from` to `to` (radians), their feet together
  const fan = (x: number, count: number, from: number, to: number) => { for (let q = 0; q < count; q++) { const a = count === 1 ? 0 : from + (to - from) * q / (count - 1), r = size * .46; sym("dc", x + Math.sin(a) * r, y + size * .46 - Math.cos(a) * r, a); } };
  // an arch of chains from x1 to x2, rising in the middle
  const arch = (x1: number, x2: number, count: number, rise: number) => { for (let q = 1; q <= count; q++) { const f = q / (count + 1); sym("ch", x1 + (x2 - x1) * f, y - Math.sin(Math.PI * f) * rise * size, 0, .5); } };
  if (w.k === "shell") {
    if (!half) for (let q = 0; q < reps; q++) { sym("sc", at(q * m)); fan(at(q * m + 3), 5, -.7, .7); }
    else { fan(at(0), 3, 0, .7); for (let q = 0; q < reps; q++) { sym("sc", at(q * m + 3)); if (q < reps - 1) fan(at(q * m + 6), 5, -.7, .7); } fan(at(reps * m - 1) + gap * .5, 2, -.7, -.35); }
    return true;
  }
  if (w.k === "moss") { for (let s = 0; s < reps * m; s++) sym(s % 2 === (half ? 1 : 0) ? "sc" : "ch", at(s), y, 0, s % 2 === (half ? 1 : 0) ? 1 : .7); return true; }
  if (w.k === "net") {
    if (!half) for (let q = 0; q < reps; q++) { sym("sc", at(q * m)); arch(at(q * m), at(q * m + m), 5, .5); }
    else { arch(at(0) - gap * .5, at(2), 2, .25); for (let q = 0; q < reps; q++) { sym("sc", at(q * m + 2)); if (q < reps - 1) arch(at(q * m + 2), at(q * m + 6), 5, .5); } arch(at(reps * m - 2), at(reps * m - 1) + gap * .5, 2, .25); }
    return true;
  }
  return false;
}

// ---------------------------------------------------------------- 표기 (Kim: 실제 도안들의 표기 원리)
// What the charts drawn in rows share. Rows that are the same row again are folded behind a wavy line and named
// ("○단~○단 같은 단 반복"); stitch numbers run under the chart, every fifth ringed; row numbers stand at its
// side, a coloured dot where a part begins; the start is marked, with the way the work goes; a row's whole count
// stands at its right only where the count changes; the edging is drawn in its own colour. Only the way such
// charts are written is taken - every row and every number here is the plan's own.
export const RIM_INK = "#B5562E";
const NOTE_INK = "#5B4B45";
const PART_DOT: Partial<Record<Row["part"], string>> = { bottom: "#1D9E75", body: "#3B6D11", rim: RIM_INK, flap: "#7F77DD", handle: "#D4537E", rows: "#3B6D11", rounds: "#3B6D11", panel: "#1D9E75", strip: "#BA7517", strap: "#D4537E" };
const PART_NAME: Partial<Record<Row["part"], string>> = { bottom: "바닥", body: "몸통", rim: "테두리", flap: "덮개", handle: "손잡이", rows: "편물", rounds: "몸통", panel: "판", strip: "띠", strap: "끈" };

export type Folded<T> = { row: T; i: number } | { fold: [number, number] };
/** Rows that are the same row again and again, folded: a run of `min` or more keeps its first and its last,
 *  the rows between become one fold [from, to] (indexes into `rows`). The row being made (`keep`) stays in sight
 *  inside a fold. A fold never hides one row alone. */
export function foldRows<T>(rows: T[], same: (a: T, b: T) => boolean, keep = -1, min = 4): Folded<T>[] {
  const out: Folded<T>[] = [], hide = (a: number, b: number) => { if (b < a) return; if (a === b) out.push({ row: rows[a], i: a }); else out.push({ fold: [a, b] }); };
  for (let i = 0; i < rows.length;) {
    let j = i; while (j + 1 < rows.length && same(rows[i], rows[j + 1])) j++;
    if (j - i + 1 < min) for (let k = i; k <= j; k++) out.push({ row: rows[k], i: k });
    else {
      out.push({ row: rows[i], i });
      if (keep > i && keep < j) { hide(i + 1, keep - 1); out.push({ row: rows[keep], i: keep }); hide(keep + 1, j - 1); } else hide(i + 1, j - 1);
      out.push({ row: rows[j], i: j });
    }
    i = j + 1;
  }
  return out;
}
/** what makes two rows "the same row": their part, their count, what they gain or lose and where, their pattern round */
export const rowSig = (r: Row) => [r.part, r.n, r.inc || 0, r.edge ? r.edge.join(",") : "", r.wall ? `${r.wall.k}${r.wall.i ? 1 + (r.wall.i % 2) : 0}` : "", r.post ?? "", r.how.startsWith("빼뜨기") ? "s" : ""].join("|");
/** a row's own number, as it stands at the chart's side ("12단" -> 12, "앞판 기둥1 7단" -> 7, "테두리 1" -> 1) */
export const rowNo = (r: Row) => r.label.match(/(\d+)\s*단?$/)?.[1] ?? r.label;
/** the count changes in this row (the only rows that carry "(총 ○코)") */
export const rowChanges = (r: Row) => !!(r.inc || (r.edge && (r.edge[0] || r.edge[1])));
const isRim = (r: Row) => r.part === "rim" || r.grown?.k === "edge";

interface ChartSpec {
  /** bottom to top; a line is one row (two for a hobo's posts, which stand side by side) */
  lines: Row[][];
  /** stitch columns across, and the stitches they stand for when not every stitch is drawn */
  cols: number; real?: number;
  /** a row's symbols: [column (may fall between two), symbol, size] */
  cells: (r: Row) => [number, StitchSym, number?][];
  /** a stitch pattern's round drawn in its own symbols (true when it was) */
  wall?: (ctx: CanvasRenderingContext2D, r: Row, y: number, size: number, color: string, wt: number, x0: number, bw: number) => boolean;
  chain?: { row: Row; from: number; n: number } | null;
  label: string;
  after?: (g: { ctx: CanvasRenderingContext2D; X: (c: number) => number; y1: number; rowH: number; yOf: (line: number) => number | null; size: number; wt: number; now: string; gap: number }) => void;
}
function drawLines(cv: HTMLCanvasElement, p: Project, s: ChartSpec) {
  const { ctx, W, H } = setup(cv), col = colors(p.color), small = W < 430, fs = small ? 9.5 : 11;
  const stOf = (r: Row): St => (r.idx < p.current ? "done" : r.idx === p.current ? "now" : "future");
  const sig = (l: Row[]) => l.map(rowSig).join("/"), keep = s.lines.findIndex(l => l.some(r => r.idx === p.current));
  let disp = foldRows(s.lines, (a, b) => sig(a) === sig(b), keep), cut = false;
  const CAP = small ? 30 : 40;
  if (disp.length > CAP) { const at = Math.max(0, disp.findIndex(d => "row" in d && d.i >= Math.max(0, keep))), from = Math.max(0, Math.min(at - CAP / 2, disp.length - CAP)); cut = from > 0; disp = disp.slice(from, from + CAP); }
  const left = small ? 30 : 62, right = small ? 50 : 76, bw = Math.min(W - left - right, s.cols * 22, 470), gap = bw / s.cols, x0 = left + (W - left - right - bw) / 2;
  const y1 = H - 58, rowH = Math.min(22, (y1 - 18) / (disp.length + 1)), size = Math.max(5, Math.min(rowH * .88, gap * 1.3)), wt = size < 8 ? 1 : 1.2, X = (c: number) => x0 + (c + .5) * gap;
  const fam = getComputedStyle(document.body).fontFamily || "serif", font = (px: number, bold = false) => `${bold ? "600 " : ""}${px}px ${fam}`;
  const rimCol = (st: St) => (st === "now" ? col.now : st === "done" ? RIM_INK : "rgba(181,86,46,.38)");
  if (s.chain && !cut) { const st = stOf(s.chain.row); for (let c = 0; c < s.chain.n; c++) drawSym(ctx, "ch", X(s.chain.from + c), y1, Math.min(size, gap * 1.05), 0, col[st], wt); }
  const ys = new Map<number, number>();
  disp.forEach((d, k) => {
    const y = y1 - (k + 1) * rowH;
    if ("fold" in d) {
      // the fold: two wavy lines across the chart, and what they stand for
      const [a, b] = d.fold, inside = keep >= a && keep <= b;
      ctx.strokeStyle = inside ? col.now : NOTE_INK; ctx.globalAlpha = inside ? 1 : .55; ctx.lineWidth = 1;
      for (const dy of [-3, 3]) { ctx.beginPath(); for (let x = x0; x <= x0 + bw; x += 2) { const yy = y + dy + Math.sin((x - x0) / 7) * 2; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
      ctx.globalAlpha = 1;
      const text = `${s.lines[a][0].label}~${s.lines[b][0].label} 같은 단 반복`; ctx.font = font(fs); const tw = ctx.measureText(text).width;
      ctx.clearRect(x0 + bw / 2 - tw / 2 - 6, y - fs * .8, tw + 12, fs * 1.6);
      ctx.fillStyle = NOTE_INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x0 + bw / 2, y);
      return;
    }
    ys.set(d.i, y);
    const line = d.row, r0 = line[0], st0 = stOf(r0);
    for (const r of line) {
      const st = stOf(r), color = isRim(r) ? rimCol(st) : col[st];
      if (s.wall && s.wall(ctx, r, y, size, color, wt, x0, bw)) continue;
      for (const [c, sym, k2] of s.cells(r)) drawSym(ctx, sym, X(c), y, size * (k2 ?? 1), 0, color, wt);
    }
    // at the side: the row's number, and a dot where its part begins; at the right: its count, where it changes
    ctx.font = font(fs, st0 === "now"); ctx.textBaseline = "middle"; ctx.textAlign = "right"; ctx.fillStyle = NOTE_INK; ctx.globalAlpha = st0 === "future" ? .5 : .9;
    const no = rowNo(r0), nw = ctx.measureText(no).width; ctx.fillText(no, x0 - 8, y);
    const starts = d.i === 0 || s.lines[d.i - 1][0].part !== r0.part || (r0.post != null && s.lines[d.i - 1][0].post == null);
    if (starts && PART_DOT[r0.part]) {
      ctx.globalAlpha = 1; ctx.fillStyle = PART_DOT[r0.part]!; ctx.beginPath(); ctx.arc(x0 - 8 - nw - 7, y, 3, 0, Math.PI * 2); ctx.fill();
      if (!small && PART_NAME[r0.part]) { ctx.font = font(fs - 1); ctx.fillStyle = NOTE_INK; ctx.globalAlpha = .75; ctx.fillText(PART_NAME[r0.part]!, x0 - 8 - nw - 14, y); }
    }
    if (line.some(rowChanges)) { ctx.font = font(fs); ctx.textAlign = "left"; ctx.fillStyle = NOTE_INK; ctx.globalAlpha = st0 === "future" ? .5 : .9; ctx.fillText(small ? `(${r0.n}코)` : `(총 ${r0.n}코)`, x0 + bw + 7, y); }
    ctx.globalAlpha = 1;
  });
  // under the chart: the stitches' numbers, every fifth ringed (when not every stitch is drawn the numbers are
  // the stitches the columns stand for, and only the ringed ones are written)
  const scaled = !!s.real && s.real !== s.cols, noOf = (c: number) => (scaled ? Math.max(1, Math.round((c + .5) * (s.real as number) / s.cols)) : c + 1), yn = y1 + 20;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let c = 0; c < s.cols; c++) {
    const fifth = (c + 1) % 5 === 0;
    if (!fifth && (scaled || small || gap < 15)) continue;
    const t = String(noOf(c)); ctx.font = font(fifth ? fs : fs - 1); ctx.fillStyle = NOTE_INK; ctx.globalAlpha = fifth ? 1 : .7; ctx.fillText(t, X(c), yn);
    if (fifth) { ctx.globalAlpha = 1; ctx.strokeStyle = RIM_INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X(c), yn, Math.max(fs * .78, ctx.measureText(t).width / 2 + 3), 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  // the start, and the way the work goes: a first row is worked from the right end to the left
  const ya = y1 + 40; ctx.font = font(fs); ctx.fillStyle = NOTE_INK; ctx.textAlign = "right"; ctx.fillText("시작", x0 + bw, ya);
  const ax = x0 + bw - ctx.measureText("시작").width - 8; ctx.strokeStyle = NOTE_INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax, ya); ctx.lineTo(ax - 30, ya); ctx.moveTo(ax - 23, ya - 4); ctx.lineTo(ax - 30, ya); ctx.lineTo(ax - 23, ya + 4); ctx.stroke();
  if (scaled && !small) { ctx.textAlign = "left"; ctx.globalAlpha = .75; ctx.font = font(fs - 1); ctx.fillText(`${s.real}코 가운데 ${s.cols}코만 그렸습니다`, x0, ya); ctx.globalAlpha = 1; }
  s.after?.({ ctx, X, y1, rowH, yOf: i => ys.get(i) ?? null, size, wt, now: col.now, gap });
  cv.setAttribute("aria-label", s.label);
  cv.dataset.folds = String(disp.filter(d => "fold" in d).length); cv.dataset.lines = String(s.lines.length);
}

/** A flat piece that changes width (lib/structure: a panel with rounded corners, a strip, a hobo's posts, a
 *  slant or a triangle, a flap that narrows), row over row as it lies: each row's stitches where pieceLayout
 *  sets them - the same grid the 3D draws. A gain at an edge is a V there, a loss an upturned V; the base chain
 *  lies under the first row. While the piece is being joined (잇기) its edge is ringed with 되돌아짧은뜨기. */
function drawPiece(cv: HTMLCanvasElement, p: Project, pp: Plan) {
  const ci = Math.max(0, Math.min(p.current, pp.rows.length - 1)); let k = ci;
  while (k > 0 && pieceOf(pp.rows[k]) == null) k--;
  // joining: the panel being joined (its name leads the step's), not the piece worked last
  if (pp.rows[ci].part === "join") { const name = pp.rows[ci].label.slice(0, 2), j = pp.rows.findIndex(r => r.part === "panel" && (pieceOf(r) === name || !/^(앞판|뒤판)/.test(pp.rows[ci].label))); if (j >= 0) k = j; }
  const key = pieceOf(pp.rows[k]) ?? pieceOf(pp.rows.find(r => pieceOf(r) != null) ?? pp.rows[0]);
  let a = k, b = k; while (a > 0 && pieceOf(pp.rows[a - 1]) === key) a--; while (b < pp.rows.length - 1 && pieceOf(pp.rows[b + 1]) === key) b++;
  const all = pp.rows.slice(a, b + 1), chain = all.find(isChainRow), body = all.filter(r => !isChainRow(r));
  if (!body.length) return drawGrid(cv, p, pp);
  const lay = pieceLayout(body), lines = pieceRows(body), pos = new Map(body.map((r, i) => [r, lay.at[i]] as const)), joining = pp.rows[ci].part === "join";
  drawLines(cv, p, {
    lines, cols: lay.W, chain: chain ? { row: chain, from: lay.at[0][0], n: lay.at[0][1] } : null,
    cells: r => { const [cx, n] = pos.get(r)!, e = r.edge ?? [0, 0]; return Array.from({ length: n }, (_, c): [number, StitchSym] => [cx + c, (c === 0 && e[0] > 0) || (c === n - 1 && e[1] > 0) ? "inc" : c < -e[0] || c >= n + e[1] ? "dec" : "sc"]); },
    label: `${key ?? "편물"} 코 도안, ${lines.length}단 중 ${Math.min(lines.length, Math.max(0, lines.findIndex(l => l.some(r => r.idx >= p.current))) + 1)}단째${joining ? ", 잇는 자리 표시" : ""}`,
    after: joining ? g => {
      // the joined edge: along the bottom, and up the two sides as far as the panel goes
      const first = lay.at[0], yb = g.y1 + g.rowH * (chain ? .95 : .2);
      for (let c = 0; c < first[1]; c += 2) drawSym(g.ctx, "crab", g.X(first[0] + c), yb, g.size * .9, 0, g.now, g.wt);
      lines.forEach((l, i) => { const y = g.yOf(i); if (y == null || l[0].post != null || i % 2) return; const [cx, n] = pos.get(l[0])!; drawSym(g.ctx, "crab", g.X(cx) - g.gap * .9, y, g.size * .9, -Math.PI / 2, g.now, g.wt); drawSym(g.ctx, "crab", g.X(cx + n - 1) + g.gap * .9, y, g.size * .9, Math.PI / 2, g.now, g.wt); });
    } : undefined,
  });
}

/** the painted picture as the pattern counts it (lib/pattern paintSize / paintMask): W x H stitches, row-major
 *  from the bottom row, -1 a hole, else a colour of its palette. The 3D reads the very same cells. */
export function paintCells(f: PaintShape, g: Plan["g"]): { W: number; H: number; cells: number[] } { const { W, H } = paintSize(f, g); return { W, H, cells: paintMask(f, W, H) }; }
/** 두 색 그림 넣기 (Kim: 칸 그림으로 만든 도안은 칸 하나 = 짧은뜨기 한 코인 색 배치 기호도안): the picture's
 *  cells, one a stitch, each in its own colour (a hole left empty). Rows done are full, the row being made is
 *  framed, rows to come are pale. Stitch numbers under it (every fifth ringed), row numbers at its side. */
function drawPaint(cv: HTMLCanvasElement, p: Project, pp: Plan) {
  const { ctx, W, H } = setup(cv), f = p.paint!, { W: gw, H: gh, cells } = paintCells(f, pp.g), small = W < 430, fs = small ? 9.5 : 11;
  const left = small ? 26 : 40, bw = Math.min(W - left - 20, gw * 20, 470), cell = Math.min(bw / gw, (H - 96) / gh), x0 = left + (W - left - 20 - cell * gw) / 2, y1 = H - 58;
  const fam = getComputedStyle(document.body).fontFamily || "serif"; let made = 0;
  for (let r = 0; r < gh; r++) {
    const row = cells.slice(r * gw, (r + 1) * gw); if (!row.some(c => c >= 0)) continue;
    const idx = ++made, st: St = idx < p.current ? "done" : idx === p.current ? "now" : "future", y = y1 - (r + 1) * cell;   // pp.rows[0] is the base chain
    row.forEach((c, x) => {
      if (c < 0) return;
      ctx.globalAlpha = st === "future" ? .32 : 1; ctx.fillStyle = f.palette[c] ?? p.color ?? "#C9B79C"; ctx.fillRect(x0 + x * cell, y, cell, cell);
      ctx.globalAlpha = .35; ctx.strokeStyle = NOTE_INK; ctx.lineWidth = .5; ctx.strokeRect(x0 + x * cell + .25, y + .25, cell - .5, cell - .5);
    });
    ctx.globalAlpha = 1;
    if (st === "now") { ctx.strokeStyle = css("--dot-now"); ctx.lineWidth = 1.6; ctx.strokeRect(x0 - 1, y - 1, cell * gw + 2, cell + 2); }
    if (r === 0 || (r + 1) % 5 === 0 || st === "now") { ctx.font = `${st === "now" ? "600 " : ""}${fs}px ${fam}`; ctx.fillStyle = NOTE_INK; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(String(r + 1), x0 - 6, y + cell / 2); }
  }
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (let c = 0; c < gw; c++) {
    const fifth = (c + 1) % 5 === 0; if (!fifth && (small || cell < 15)) continue;
    const t = String(c + 1), xx = x0 + (c + .5) * cell; ctx.font = `${fifth ? fs : fs - 1}px ${fam}`; ctx.fillStyle = NOTE_INK; ctx.globalAlpha = fifth ? 1 : .7; ctx.fillText(t, xx, y1 + 18);
    if (fifth) { ctx.globalAlpha = 1; ctx.strokeStyle = RIM_INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(xx, y1 + 18, Math.max(fs * .78, ctx.measureText(t).width / 2 + 3), 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.font = `${fs}px ${fam}`; ctx.fillStyle = NOTE_INK; ctx.textAlign = "right"; const xe = x0 + cell * gw; ctx.fillText("시작", xe, y1 + 38);
  const ax = xe - ctx.measureText("시작").width - 8; ctx.strokeStyle = NOTE_INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ax, y1 + 38); ctx.lineTo(ax - 30, y1 + 38); ctx.moveTo(ax - 23, y1 + 34); ctx.lineTo(ax - 30, y1 + 38); ctx.lineTo(ax - 23, y1 + 42); ctx.stroke();
  cv.setAttribute("aria-label", `색 배치 기호도안, 가로 ${gw}코 세로 ${gh}단, 색 ${f.palette.length}가지`);
  cv.dataset.colors = String(f.palette.length);
}

export function drawTrack(cv: HTMLCanvasElement, p: Project, pp: Plan) {
  delete cv.dataset.folds; delete cv.dataset.lines; delete cv.dataset.colors;
  if (p.paint) return drawPaint(cv, p, pp);
  const cur = pp.rows[Math.max(0, Math.min(p.current, pp.rows.length - 1))];
  if (cur && (cur.part === "panel" || cur.part === "strip" || cur.part === "strap" || cur.part === "join" || (cur.part === "flap" && pp.rows.some(r => r.part === "flap" && r.edge)) || (p.object === "rows" && pp.rows.some(r => r.edge)) || (cur.part === "finish" && pp.rows.some(r => r.part === "panel" || r.edge)))) return drawPiece(cv, p, pp);
  if (p.object === "rows" || p.object === "tube") return drawGrid(cv, p, pp);
  const R = pp.bottomRounds;
  if (p.current < R || p.object !== "bag") {
    drawMap(cv, pp, p.shape, R, r => r - 1 < p.current ? "done" : (r - 1 === p.current ? "now" : "future"), p.color);
    cv.setAttribute("aria-label", `바닥 코 도안, ${R}단 중 ${Math.min(p.current + 1, R)}단째`); return;
  }
  // the body seen from the side: a row of symbols per round (at most 36 across), increases as V and decreases as
  // upturned V spread evenly, a stitch pattern's rounds in their own symbols, the rim's slip stitches as ovals
  const body = pp.rows.filter(r => r.part === "body" || r.part === "rim" || r.part === "flap"), real = Math.max(1, ...body.map(r => r.n)), cols = Math.min(36, real);
  drawLines(cv, p, {
    lines: body.map(r => [r]), cols, real,
    wall: (ctx, r, y, size, color, wt, x0, bw) => !!r.wall && drawWall(ctx, r.wall, Math.min(cols, r.n), x0, bw, y, size, color, wt),
    cells: r => {
      const n = Math.min(cols, r.n), slip = r.part === "rim" && r.how.startsWith("빼뜨기"), ch = Math.min(n, Math.round(Math.abs(r.inc || 0) * n / r.n));
      return Array.from({ length: n }, (_, k): [number, StitchSym, number?] => { const hit = ch > 0 && Math.floor((k + 1) * ch / n) !== Math.floor(k * ch / n); return [(k + .5) * cols / n - .5, slip ? "sl" : hit ? ((r.inc || 0) > 0 ? "inc" : "dec") : "sc", slip ? .8 : 1]; });
    },
    label: "몸통을 옆에서 본 코 도안",
  });
}

/** Flat pieces and tubes: rows of + stacked bottom to top (row 1 at the bottom) over the start chain, stitches
 *  only (no 기둥사슬, Kim's call). Rows that repeat are folded (the old chart showed 12 rows and a bar). */
function drawGrid(cv: HTMLCanvasElement, p: Project, pp: Plan) {
  const rows = pp.rows.filter(r => r.part === "rows" || r.part === "rounds"), tube = p.object === "tube", real = Math.max(1, pp.last), cols = Math.min(40, real), start = pp.rows.find(r => r.part === "start");
  drawLines(cv, p, {
    lines: rows.map(r => [r]), cols, real, chain: start ? { row: start, from: 0, n: cols } : null,
    cells: () => Array.from({ length: cols }, (_, k): [number, StitchSym] => [k, "sc"]),
    label: `${tube ? "둘레뜨기" : "왕복뜨기"} 코 도안, ${rows.length}단 중 ${Math.min(Math.max(1, p.current), rows.length)}단째`,
  });
}
