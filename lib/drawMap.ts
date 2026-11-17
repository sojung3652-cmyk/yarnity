// Canvas renderers for the 따라 뜨기 stitch map, drawn as a crochet chart with the standard symbols
// (lib/stitchSymbols.ts): a magic ring or a chain base at the centre, single crochet (+) and increases (V)
// around it, each turned to grow outward; rows and tubes as rows of + with their chains / slip stitches.
// Browser-only: reads CSS colour tokens from :root.
import { dots, type Plan, type Shape } from "./pattern";
import { drawSym, type StitchSym } from "./stitchSymbols";
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
 *  V (increase), each turned to grow outward from the centre. */
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
  else { const n = pp.c, gap = pp.g.w * sc; for (let k = 0; k < n; k++) drawSym(ctx, "ch", cx + (k - (n - 1) / 2) * gap, cy, Math.min(size, gap * 1.1), 0, col[st1], weight); }

  for (const d of ds) {
    const st = stateOf(d.r), n = d.pts.length;
    d.pts.forEach((p, i) => {
      // outward normal from the neighbours' tangent (works for circles, ovals and rectangles)
      const a = d.pts[(i - 1 + n) % n], b = d.pts[(i + 1) % n], tx = b.x - a.x, ty = b.y - a.y, nx = ty, ny = -tx;
      const sym: StitchSym = p.inc ? "inc" : "sc";
      drawSym(ctx, sym, cx + p.x * sc, cy + p.y * sc, size, Math.atan2(nx, -ny), col[st], weight);
    });
  }
}

export function drawTrack(cv: HTMLCanvasElement, p: Project, pp: Plan) {
  if (p.object === "rows" || p.object === "tube") return drawGrid(cv, p, pp);
  const R = pp.bottomRounds;
  if (p.current < R || p.object !== "bag") {
    drawMap(cv, pp, p.shape, R, r => r - 1 < p.current ? "done" : (r - 1 === p.current ? "now" : "future"), p.color);
    cv.setAttribute("aria-label", `바닥 코 도안, ${R}단 중 ${Math.min(p.current + 1, R)}단째`); return;
  }
  // the body seen from the side: one row of symbols per row (at most 36 shown), increases as V spread
  // evenly, the rim's slip-stitch row as filled ovals
  const { ctx, W, H } = setup(cv), col = colors(p.color);
  const body = pp.rows.filter(r => r.part === "body" || r.part === "rim" || r.part === "flap");
  const bw = Math.min(W * 0.66, 440), x0 = (W - bw) / 2, rowH = Math.min(18, (H - 90) / (body.length + 2)), y1 = H - 44;
  ctx.fillStyle = css("--dot"); ctx.fillRect(x0, y1, bw, 1.5);
  body.forEach((r, i) => {
    const st: St = r.idx < p.current ? "done" : r.idx === p.current ? "now" : "future";
    const y = y1 - (i + 0.5) * rowH, n = Math.min(36, r.n), gap = bw / n, size = Math.max(5, Math.min(rowH * 0.9, gap * 1.3));
    const slip = r.part === "rim" && r.how.startsWith("빼뜨기"), incs = Math.min(n, Math.round((r.inc || 0) * n / r.n));
    for (let k = 0; k < n; k++) {
      const isInc = incs > 0 && Math.floor((k + 1) * incs / n) !== Math.floor(k * incs / n);
      drawSym(ctx, slip ? "sl" : isInc ? "inc" : "sc", x0 + (k + 0.5) * gap, y, slip ? size * 0.8 : size, 0, col[st], size < 8 ? 1 : 1.2);
    }
  });
  cv.setAttribute("aria-label", "몸통을 옆에서 본 코 도안");
}

/** Flat pieces and tubes: rows of + stacked bottom to top (row 1 at the bottom) over the start chain; a
 *  turning chain at each row's end (rows) or a slip stitch closing each round (tubes). With many rows only
 *  the 12 around the one being made are drawn; a thin bar on the right shows where that is overall. */
function drawGrid(cv: HTMLCanvasElement, p: Project, pp: Plan) {
  const { ctx, W, H } = setup(cv), col = colors(p.color);
  const rows = pp.rows.filter(r => r.part === "rows" || r.part === "rounds"), total = rows.length, tube = p.object === "tube";
  const cur = Math.max(0, p.current - 1);                       // rows[i] is pp.rows[i + 1] (index 0 = start chain)
  const SHOW = 12, from = Math.max(0, Math.min(cur - 5, total - SHOW)), to = Math.min(total, from + SHOW);
  const n = Math.min(40, pp.last), bw = Math.min(W * 0.66, 440), x0 = (W - bw - 30) / 2, rowH = Math.min(26, (H - 80) / (SHOW + 1)), y1 = H - 40;
  const gap = bw / n, size = Math.max(5, Math.min(rowH * 0.85, gap * 1.3)), weight = size < 8 ? 1 : 1.2;
  // the start chain along the bottom (only while it is in view)
  if (from === 0) { const st: St = p.current > 0 ? "done" : "now"; for (let k = 0; k < n; k++) drawSym(ctx, "ch", x0 + (k + 0.5) * gap, y1, Math.min(size, gap * 1.05), 0, col[st], weight); }
  for (let i = from; i < to; i++) {
    const idx = i + 1, st: St = idx < p.current ? "done" : idx === p.current ? "now" : "future";
    const y = y1 - (i - from + 1) * rowH;
    for (let k = 0; k < n; k++) drawSym(ctx, "sc", x0 + (k + 0.5) * gap, y, size, 0, col[st], weight);
    // rows: the turning chain at the end the next row starts from (alternating sides); tubes: the slip stitch
    const side = tube ? x0 - gap * 0.6 : (i % 2 === 0 ? x0 + bw + gap * 0.6 : x0 - gap * 0.6);
    drawSym(ctx, tube ? "sl" : "ch", side, y, tube ? size * 0.7 : Math.min(size, gap * 1.05), tube ? 0 : Math.PI / 2, col[st], weight);
  }
  // overall position
  const bx = x0 + bw + 26, bh = H - 80, by = 40;
  ctx.fillStyle = css("--dot-future"); ctx.fillRect(bx, by, 4, bh);
  ctx.fillStyle = doneColor(p.color); const f = Math.min(1, p.current / Math.max(1, pp.rows.length)); ctx.fillRect(bx, by + bh * (1 - f), 4, bh * f);
  cv.setAttribute("aria-label", `${tube ? "둘레뜨기" : "왕복뜨기"} 코 도안, ${total}단 중 ${Math.min(Math.max(1, p.current), total)}단째 주변`);
}
