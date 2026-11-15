// Canvas renderers for the 따라 뜨기 stitch map. Ported from the prototype (drawMap / drawTrack).
// Browser-only: reads CSS colour tokens from :root.
import { dots, type Plan, type Shape } from "./pattern";
import type { Project } from "./types";

type St = "done" | "now" | "future";
const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function drawMap(cv: HTMLCanvasElement, pp: Plan, shape: Shape, upto: number, stateOf: (r: number) => St) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), rect = cv.getBoundingClientRect();
  const W = Math.max(200, rect.width), H = Math.max(200, rect.height);
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext("2d")!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const ds = dots(pp, shape, upto);
  let mx = 0, my = 0; ds.forEach(d => d.pts.forEach(p => { mx = Math.max(mx, Math.abs(p.x)); my = Math.max(my, Math.abs(p.y)); }));
  const pad = 44, sc = Math.min((W - pad * 2) / (2 * mx + pp.g.w), (H - pad * 2) / (2 * my + pp.g.w));
  const col = { done: css("--dot"), now: css("--dot-now"), future: css("--dot-future") };
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
  const R = pp.bottomRounds;
  if (p.current < R || p.object !== "bag") {
    drawMap(cv, pp, p.shape, R, r => r - 1 < p.current ? "done" : (r - 1 === p.current ? "now" : "future"));
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
    ctx.fillStyle = css(st === "now" ? "--dot-now" : st === "done" ? "--dot" : "--dot-future");
    const y = y1 - (i + 1) * rowH, n = Math.min(36, r.n);
    for (let k = 0; k < n; k++) { ctx.beginPath(); ctx.arc(x0 + (k + 0.5) * bw / n, y + rowH / 2, rowH * 0.32, 0, Math.PI * 2); ctx.fill(); }
  });
  cv.setAttribute("aria-label", "몸통을 옆에서 본 단 지도");
}
