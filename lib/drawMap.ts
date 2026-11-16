// Canvas renderers for the 따라 뜨기 stitch map. Ported from the prototype (drawMap / drawTrack).
// Browser-only: reads CSS colour tokens from :root.
import { dots, type Plan, type Shape } from "./pattern";
import type { Project } from "./types";

type St = "done" | "now" | "future";
const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/** "#rgb" / "#rrggbb" / "rgb(r, g, b)" -> [r, g, b] */
function rgbOf(c: string): [number, number, number] | null {
  const h = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (h) { const x = h[1].length === 3 ? h[1].replace(/./g, ch => ch + ch) : h[1]; return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)) as [number, number, number]; }
  const m = c.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i); return m ? [+m[1], +m[2], +m[3]] : null;
}
/** Done stitches: the yarn colour when one was chosen (55%, mixed with --dot so it stays soft), else --dot. */
function doneColor(color?: string) {
  const base = css("--dot"), a = color ? rgbOf(color) : null, b = rgbOf(base);
  if (!a || !b) return base;
  return `rgb(${a.map((v, i) => Math.round(v * 0.55 + b[i] * 0.45)).join(",")})`;
}

export function drawMap(cv: HTMLCanvasElement, pp: Plan, shape: Shape, upto: number, stateOf: (r: number) => St, color?: string) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), rect = cv.getBoundingClientRect();
  const W = Math.max(200, rect.width), H = Math.max(200, rect.height);
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext("2d")!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const ds = dots(pp, shape, upto);
  let mx = 0, my = 0; ds.forEach(d => d.pts.forEach(p => { mx = Math.max(mx, Math.abs(p.x)); my = Math.max(my, Math.abs(p.y)); }));
  const pad = 44, sc = Math.min((W - pad * 2) / (2 * mx + pp.g.w), (H - pad * 2) / (2 * my + pp.g.w));
  const col = { done: doneColor(color), now: css("--dot-now"), future: css("--dot-future") };
  const rDot = Math.max(1.5, Math.min(6, pp.g.w * sc * 0.32));
  for (const d of ds) {
    const st = stateOf(d.r);
    for (const p of d.pts) {
      const x = W / 2 + p.x * sc, y = H / 2 + p.y * sc;
      ctx.beginPath(); ctx.arc(x, y, rDot, 0, Math.PI * 2);
      const c = col[st];
      if (p.inc && st !== "future") { ctx.lineWidth = 1.4; ctx.strokeStyle = c; ctx.stroke(); }
      else { ctx.fillStyle = c; ctx.fill(); }
    }
  }
}

export function drawTrack(cv: HTMLCanvasElement, p: Project, pp: Plan) {
  if (p.object === "rows" || p.object === "tube") return drawGrid(cv, p, pp);
  const R = pp.bottomRounds;
  if (p.current < R || p.object !== "bag") {
    drawMap(cv, pp, p.shape, R, r => r - 1 < p.current ? "done" : (r - 1 === p.current ? "now" : "future"), p.color);
    cv.setAttribute("aria-label", `바닥 코 지도, ${R}단 중 ${Math.min(p.current + 1, R)}단째`); return;
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1), rect = cv.getBoundingClientRect(), W = rect.width, H = rect.height;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext("2d")!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const body = pp.rows.filter(r => r.part === "body" || r.part === "rim");
  const bw = Math.min(W * 0.6, 400), x0 = (W - bw) / 2, rowH = Math.min(14, (H - 90) / (body.length + 2)), y1 = H - 44;
  ctx.fillStyle = css("--dot"); ctx.fillRect(x0, y1, bw, 2);
  body.forEach((r, i) => {
    const st = r.idx < p.current ? "done" : r.idx === p.current ? "now" : "future";
    ctx.fillStyle = st === "done" ? doneColor(p.color) : css(st === "now" ? "--dot-now" : "--dot-future");
    const y = y1 - (i + 1) * rowH, n = Math.min(36, r.n);
    for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(x0 + (k + 0.5) * bw / n, y + rowH / 2, rowH * 0.32, 0, Math.PI * 2); ctx.fill(); }
  });
  cv.setAttribute("aria-label", "몸통을 옆에서 본 단 지도");
}

/** Flat pieces and tubes: rows of dots stacked bottom to top (row 1 at the bottom). With many rows only the
 *  12 rows around the one being made are drawn large; a thin bar on the right shows where that is overall. */
function drawGrid(cv: HTMLCanvasElement, p: Project, pp: Plan) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), rect = cv.getBoundingClientRect();
  const W = Math.max(200, rect.width), H = Math.max(200, rect.height);
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext("2d")!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const rows = pp.rows.filter(r => r.part === "rows" || r.part === "rounds"), total = rows.length;
  const cur = Math.max(0, p.current - 1);                       // rows[i] is pp.rows[i + 1] (index 0 = start chain)
  const SHOW = 12, from = Math.max(0, Math.min(cur - 5, total - SHOW)), to = Math.min(total, from + SHOW);
  const n = Math.min(40, pp.last), bw = Math.min(W * 0.7, 460), x0 = (W - bw - 30) / 2, rowH = Math.min(26, (H - 80) / SHOW), y1 = H - 40;
  ctx.fillStyle = css("--dot"); ctx.fillRect(x0, y1 + 6, bw, 1.5); // the start chain
  for (let i = from; i < to; i++) {
    const idx = i + 1, st = idx < p.current ? "done" : idx === p.current ? "now" : "future";
    ctx.fillStyle = st === "done" ? doneColor(p.color) : css(st === "now" ? "--dot-now" : "--dot-future");
    const y = y1 - (i - from + 0.5) * rowH;
    for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(x0 + (k + 0.5) * bw / n, y, Math.max(1.6, Math.min(rowH * 0.3, bw / n * 0.36)), 0, Math.PI * 2); ctx.fill(); }
  }
  // overall position
  const bx = x0 + bw + 22, bh = H - 80, by = 40;
  ctx.fillStyle = css("--dot-future"); ctx.fillRect(bx, by, 4, bh);
  ctx.fillStyle = doneColor(p.color); const f = Math.min(1, p.current / Math.max(1, pp.rows.length)); ctx.fillRect(bx, by + bh * (1 - f), 4, bh * f);
  cv.setAttribute("aria-label", `${p.object === "tube" ? "둘레뜨기" : "왕복뜨기"} 단 지도, ${total}단 중 ${Math.min(Math.max(1, p.current), total)}단째 주변`);
}
