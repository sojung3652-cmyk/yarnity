// The web home's brand canvas (Kim's reference.html, web-home pack, ported as is): the medallion (340 on a 520 x 560
// logical canvas, a very shallow shadow), the gold logo (340) stitched pixel by pixel in the order time.png gives
// (0.25s - 2.55s) with a small light at the thread's end, then a light band over the gold only (once, then every 5s)
// and twinkles at points.json. The numbers are the reference's; do not change them.
// Performance: the logo's pixels are recomputed only while it is being stitched (lastP cache).
import POINTS from "@/lib/data/home/points.json";
import RAW from "@/lib/data/home/strokes.json";

export const HOME_SRC = { med: "/home/med.webp", logo: "/home/logo.webp", time: "/home/time.png" } as const;
export type HomeImages = Record<keyof typeof HOME_SRC, HTMLImageElement>;
export const HOME_END = 3.0;

const LW = 520, LH = 560;
const PTS = POINTS.pts as number[][];
const cl = (x: number) => Math.min(1, Math.max(0, x)), soft = (x: number) => 1 - Math.pow(1 - cl(x), 1.7);
type Path = { x: number[]; y: number[]; n: number; step: number; len: number };

function resample(pts: number[][], step: number): Path {
  const x = [pts[0][0]], y = [pts[0][1]]; let px = pts[0][0], py = pts[0][1], acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let dx = pts[i][0] - px, dy = pts[i][1] - py, d = Math.hypot(dx, dy);
    while (acc + d >= step) { const f = (step - acc) / d; px += dx * f; py += dy * f; x.push(px); y.push(py); dx = pts[i][0] - px; dy = pts[i][1] - py; d = Math.hypot(dx, dy); acc = 0; }
    acc += d; px = pts[i][0]; py = pts[i][1];
  }
  x.push(px); y.push(py); return { x, y, n: x.length, step, len: (x.length - 1) * step };
}
const quad = (a: number[], b: number[], c: number[], n = 8) => { const o: number[][] = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]); } return o; };

export function makeHomeScene(cv: HTMLCanvasElement, img: HomeImages) {
  const ctx = cv.getContext("2d")!;
  const mk = () => document.createElement("canvas"), lc = mk(), lx = lc.getContext("2d")!, gl = mk(), gx = gl.getContext("2d")!;
  const M = { w: 340, h: 0, x: 0, y: 0 }, LG = { w: 340, h: 0, x: 0, y: 0 };
  let TM: Uint8Array, LA: Uint8Array, outD: ImageData, LWp = 0, LHp = 0, SP: Path[] = [], STOT = 0, lastP = -1, PX = 1, tip: number[] | null = null;

  // prep
  LWp = img.logo.naturalWidth; LHp = img.logo.naturalHeight; [lc, gl].forEach(c => { c.width = LWp; c.height = LHp; });
  {
    const c = mk(); c.width = LWp; c.height = LHp; const g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(img.time, 0, 0, LWp, LHp); const td = g.getImageData(0, 0, LWp, LHp).data;
    TM = new Uint8Array(LWp * LHp); for (let i = 0; i < TM.length; i++) TM[i] = td[i * 4]; g.clearRect(0, 0, LWp, LHp); g.drawImage(img.logo, 0, 0, LWp, LHp); outD = g.getImageData(0, 0, LWp, LHp);
    LA = new Uint8Array(LWp * LHp); for (let i = 0; i < LA.length; i++) LA[i] = outD.data[i * 4 + 3];
    const k = LWp / 1200;
    SP = (RAW as number[][][]).map(s => { const p = s.map(([x, y]) => [x * k, y * k]), sm = [p[0]]; for (let i = 1; i < p.length - 1; i++) sm.push(...quad([(p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2], p[i], [(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2])); sm.push(p[p.length - 1]); return resample(sm, 2); });
    STOT = SP.reduce((a, p) => a + p.len, 0);
    M.h = M.w * img.med.naturalHeight / img.med.naturalWidth; M.x = (LW - M.w) / 2; M.y = 10;
    LG.h = LG.w * LHp / LWp; LG.x = (LW - LG.w) / 2 + 8; LG.y = M.y + M.h + 14;
  }

  function size() { const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); PX = cv.width / LW; lastP = -1; }
  function flare(x: number, y: number, r: number, a: number) {
    if (a <= .01) return; ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(255,250,225,1)"); g.addColorStop(.25, "rgba(255,236,180,.55)"); g.addColorStop(1, "rgba(255,225,150,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(255,250,228,.95)"; ctx.lineCap = "round"; ctx.lineWidth = Math.max(.5, r * .09); ctx.beginPath(); ctx.moveTo(x - r * 1.5, y); ctx.lineTo(x + r * 1.5, y); ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x, y + r * 1.5); ctx.stroke(); ctx.restore();
  }
  function frame(t: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(PX, 0, 0, PX, 0, 0);
    ctx.save(); ctx.shadowColor = "rgba(120,92,64,.26)"; ctx.shadowOffsetX = -2.5 * PX; ctx.shadowOffsetY = 4 * PX; ctx.shadowBlur = 7 * PX; ctx.drawImage(img.med, M.x, M.y, M.w, M.h); ctx.restore();
    const p = soft((t - .25) / 2.3); let rem = STOT * p; tip = null;
    for (const P of SP) { if (rem <= 0) break; if (rem < P.len) { const n = Math.min(P.n - 1, Math.floor(rem / P.step)); tip = [P.x[n], P.y[n]]; } rem -= P.len; }
    if (p !== lastP) {
      if (p >= 1) { lx.clearRect(0, 0, LWp, LHp); lx.drawImage(img.logo, 0, 0); }
      else { const o = outD.data, rv = p * 262; for (let i = 0, j = 3; i < TM.length; i++, j += 4) { const v = (rv - TM[i]) * .17; o[j] = v <= 0 ? 0 : v >= 1 ? LA[i] : LA[i] * v; } lx.putImageData(outD, 0, 0); }
      lastP = p;
    }
    ctx.save(); ctx.shadowColor = "rgba(112,78,36,.42)"; ctx.shadowOffsetX = -1.4 * PX; ctx.shadowOffsetY = 2.2 * PX; ctx.shadowBlur = 2.8 * PX; ctx.drawImage(lc, LG.x, LG.y, LG.w, LG.h); ctx.restore();
    const band = (u: number, al: number) => {
      if (u <= 0 || u >= 1) return; const w = LWp, h = LHp, gp = -w * .15 + w * 1.3 * u; gx.globalCompositeOperation = "source-over"; gx.clearRect(0, 0, w, h);
      const g = gx.createLinearGradient(gp - w * .11, 0, gp + w * .11, h * .3); g.addColorStop(0, "rgba(255,244,205,0)"); g.addColorStop(.5, "rgba(255,247,218,1)"); g.addColorStop(1, "rgba(255,244,205,0)"); gx.fillStyle = g; gx.fillRect(0, 0, w, h);
      gx.globalCompositeOperation = "destination-in"; gx.drawImage(lc, 0, 0); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = al; ctx.drawImage(gl, LG.x, LG.y, LG.w, LG.h); ctx.restore();
    };
    band((t - 2.45) / .9, .42); if (t > HOME_END) band(((t - HOME_END) % 5) / 1.2, .34);
    if (tip) flare(LG.x + tip[0] * LG.w / LWp, LG.y + tip[1] * LG.h / LHp, 11, .8);
    const on = cl((t - 1) / 1.2);
    if (on > 0) PTS.forEach(([fx, fy], i) => { if (p >= 1 || fx < p * .95 - .04) { const v = Math.sin((t * (.5 + ((i * 7) % 5) * .09) + (i * .618) % 1) * Math.PI * 2), a = Math.pow(Math.max(0, v), 10); flare(LG.x + fx * LG.w, LG.y + fy * LG.h, (5 + ((i * 3) % 4) * 2.2) * LG.w / 560 * (.6 + .4 * a), a * .8 * on); } });
  }
  return { size, frame };
}
