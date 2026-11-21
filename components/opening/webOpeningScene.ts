// The web's embroidered opening (Kim): reference.html's prep() / layout() / frame() moved here as they are. The
// numbers, coordinates and timings are the reference's own and are not to be changed (Kim): END, the layouts for
// 1920 x 1080 and 1080 x 1920, the handwriting strokes (lib/data/opening-web/strokes.json, its RAW), the stars and
// twinkle points (data.json, its DATA), the per-pixel logo reveal from time.png (putImageData, cached once whole:
// lastP), the sentence and flower-rule reveals, the light band, the thread tip, the twinkles, the slow zoom.
// Only what was global in the reference (its canvas, its images, the sizes) comes in as arguments; size()'s
// button placement is returned instead of set on an element.
import DATA from "@/lib/data/opening-web/data.json";
import RAW from "@/lib/data/opening-web/strokes.json";

export const END = 4.5;
export const SRC = { bg: "/opening-web/bg.jpg", med: "/opening-web/med.webp", logo: "/opening-web/logo.webp", text: "/opening-web/text.webp", time: "/opening-web/time.png" } as const;
export type WebOpeningImages = Record<keyof typeof SRC, HTMLImageElement>;

const cl = (x: number) => Math.min(1, Math.max(0, x)), soft = (x: number) => 1 - Math.pow(1 - cl(x), 1.7);
function resample(pts: number[][], step: number) {
  const x = [pts[0][0]], y = [pts[0][1]]; let px = pts[0][0], py = pts[0][1], acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let dx = pts[i][0] - px, dy = pts[i][1] - py, d = Math.hypot(dx, dy);
    while (acc + d >= step) { const f = (step - acc) / d; px += dx * f; py += dy * f; x.push(px); y.push(py); dx = pts[i][0] - px; dy = pts[i][1] - py; d = Math.hypot(dx, dy); acc = 0; }
    acc += d; px = pts[i][0]; py = pts[i][1];
  }
  x.push(px); y.push(py); return { x, y, n: x.length, step, len: (x.length - 1) * step };
}
const quad = (a: number[], b: number[], c: number[], n = 8) => { const o: number[][] = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]); } return o; };
function flare(c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (a <= .01) return; c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = a;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(255,250,225,1)"); g.addColorStop(.25, "rgba(255,236,180,.55)"); g.addColorStop(1, "rgba(255,225,150,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.strokeStyle = "rgba(255,250,228,.95)"; c.lineCap = "round"; c.lineWidth = Math.max(.5, r * .09); c.beginPath(); c.moveTo(x - r * 1.5, y); c.lineTo(x + r * 1.5, y); c.moveTo(x, y - r * 1.5); c.lineTo(x, y + r * 1.5); c.stroke(); c.restore();
}

type Lay = { mh: number; mx: number; my: number; lw: number; lcx: number; lcy: number; tw: number; tcx: number; tcy: number; bh: number; mw: number; lh: number; th: number; lx: number; ly: number; tx: number; ty: number };
type Path = ReturnType<typeof resample>;

/** the reference's scene on `cv` with the loaded images: size(VW, VH, DPR) (its size() + layout()) and frame(t) */
export function makeScene(cv: HTMLCanvasElement, img: WebOpeningImages) {
  const ctx = cv.getContext("2d")!;
  const mk = () => document.createElement("canvas"), lc = mk(), lx = lc.getContext("2d")!, gl = mk(), gx = gl.getContext("2d")!, tc = mk(), tx = tc.getContext("2d")!;
  let VW = 1, VH = 1, DPR = 1, SC = 1, OX = 0, OY = 0, PX = 1, LW = 1920, LH = 1080, L = {} as Lay, SP: Path[] = [], STOT = 0;
  let tw: { fx: number; x: number; y: number; ph: number; sp: number; s: number }[] = [], tip: number[] | null = null;
  let TM: Uint8Array = new Uint8Array(0), LA: Uint8Array = new Uint8Array(0), outD!: ImageData, lastP = -1, LWp = 0, LHp = 0;

  function prep() { LWp = img.logo.naturalWidth; LHp = img.logo.naturalHeight; [lc, gl].forEach(c => { c.width = LWp; c.height = LHp; }); const c = mk(); c.width = LWp; c.height = LHp; const g = c.getContext("2d", { willReadFrequently: true })!; g.drawImage(img.time, 0, 0, LWp, LHp); const td = g.getImageData(0, 0, LWp, LHp).data; TM = new Uint8Array(LWp * LHp); for (let i = 0; i < TM.length; i++) TM[i] = td[i * 4]; g.clearRect(0, 0, LWp, LHp); g.drawImage(img.logo, 0, 0, LWp, LHp); outD = g.getImageData(0, 0, LWp, LHp); LA = new Uint8Array(LWp * LHp); for (let i = 0; i < LA.length; i++) LA[i] = outD.data[i * 4 + 3]; }
  function layout() {
    const portrait = VH / VW > 1.12; LW = portrait ? 1080 : 1920; LH = portrait ? 1920 : 1080; SC = Math.min(VW / LW, VH / LH); OX = (VW - LW * SC) / 2; OY = (VH - LH * SC) / 2; PX = SC * DPR;
    const mr = img.med.naturalWidth / img.med.naturalHeight, lr = img.logo.naturalHeight / img.logo.naturalWidth, tr = img.text.naturalHeight / img.text.naturalWidth;
    L = (portrait ? { mh: 940, mx: 540, my: 610, lw: 1010, lcx: 548, lcy: 1318, tw: 940, tcx: 540, tcy: 1610, bh: 1100 } : { mh: 575, mx: 960, my: 332, lw: 640, lcx: 978, lcy: 744, tw: 600, tcx: 960, tcy: 932, bh: 760 }) as Lay;
    L.mw = L.mh * mr; L.lh = L.lw * lr; L.th = L.tw * tr; L.lx = L.lcx - L.lw / 2; L.ly = L.lcy - L.lh / 2; L.tx = L.tcx - L.tw / 2; L.ty = L.tcy - L.th / 2;
    tc.width = Math.ceil(L.tw * PX); tc.height = Math.ceil(L.th * PX);
    const k = LWp / 1200; lastP = -1; SP = (RAW as number[][][]).map(s => { const p = s.map(([x, y]) => [x * k, y * k]), sm = [p[0]]; for (let i = 1; i < p.length - 1; i++) sm.push(...quad([(p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2], p[i], [(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2])); sm.push(p[p.length - 1]); return resample(sm, Math.max(1.5, 2 * k)); });
    STOT = SP.reduce((a, p) => a + p.len, 0);
    tw = (DATA.pts as number[][]).map(([fx, fy], i) => ({ fx, x: L.lx + fx * L.lw, y: L.ly + fy * L.lh, ph: (i * .618) % 1, sp: .5 + ((i * 7) % 5) * .09, s: (5 + ((i * 3) % 4) * 2.2) * L.lw / 560 }));
  }
  function cover() { const iw = img.bg.naturalWidth, ih = img.bg.naturalHeight, s = Math.max(cv.width / iw, cv.height / ih), w = iw * s, h = ih * s; return { x: (cv.width - w) / 2, y: (cv.height - h) / 2, w, h }; }

  function frame(t: number) {
    const W = cv.width, H = cv.height, z = 1 + .025 * Math.sin(Math.PI / 2 * cl(t / 6)), B = cover();
    const out = 0;
    ctx.setTransform(z, 0, 0, z, W / 2 * (1 - z), H / 2 * (1 - z)); ctx.globalAlpha = 1; ctx.drawImage(img.bg, B.x, B.y, B.w, B.h);
    /* embroidered stars on the linen breathe a little */
    (DATA.stars as number[][]).forEach(([fx, fy, sz], i) => { const v = Math.sin((t * (.22 + (i % 5) * .04) + i * .37) * Math.PI * 2), a = Math.pow(Math.max(0, v), 6); flare(ctx, B.x + fx * B.w, B.y + fy * B.h, (7 + sz * 9) * PX * (1920 / LW > 1 ? 1 : 1), a * .5); });
    ctx.setTransform(PX * z, 0, 0, PX * z, OX * DPR * z + W / 2 * (1 - z), OY * DPR * z + H / 2 * (1 - z) - out * 70 * PX); ctx.globalAlpha = 1 - out;
    /* medallion sits on the fabric */
    ctx.save(); ctx.shadowColor = "rgba(120,92,64,.26)"; ctx.shadowOffsetX = -2.5 * PX; ctx.shadowOffsetY = 4 * PX; ctx.shadowBlur = 7 * PX; ctx.drawImage(img.med, L.mx - L.mw / 2, L.my - L.mh / 2, L.mw, L.mh); ctx.restore();
    /* logo: reveal along the handwriting path */
    const w = lc.width, h = lc.height, p = soft((t - .15) / 2.5); let rem = STOT * p; tip = null;
    for (const P of SP) { if (rem <= 0) break; if (rem < P.len) { const n = Math.min(P.n - 1, Math.floor(rem / P.step)); tip = [P.x[n], P.y[n]]; } rem -= P.len; }
    if (p !== lastP) { if (p >= 1) { lx.clearRect(0, 0, w, h); lx.drawImage(img.logo, 0, 0, w, h); } else { const o = outD.data, rv = p * 262; for (let i = 0, j = 3; i < TM.length; i++, j += 4) { const v = (rv - TM[i]) * .17; o[j] = v <= 0 ? 0 : v >= 1 ? LA[i] : LA[i] * v; } lx.putImageData(outD, 0, 0); } lastP = p; }
    const thread = (c: HTMLCanvasElement, x: number, y: number, ww: number, hh: number) => { ctx.save(); ctx.shadowColor = "rgba(112,78,36,.42)"; ctx.shadowOffsetX = -1.6 * PX; ctx.shadowOffsetY = 2.6 * PX; ctx.shadowBlur = 3.2 * PX; ctx.drawImage(c, x, y, ww, hh); ctx.restore(); };
    thread(lc, L.lx, L.ly, L.lw, L.lh);
    /* sentence, then the flower rule from the centre outwards */
    const tw_ = tc.width, th_ = tc.height, tp = soft((t - 2.7) / 1.0), dp = soft((t - 3.6) / .8); tx.globalCompositeOperation = "source-over"; tx.clearRect(0, 0, tw_, th_);
    if (tp > 0) { const xe = tw_ * 1.08 * tp, g = tx.createLinearGradient(xe - tw_ * .08, 0, xe, 0); g.addColorStop(0, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); tx.fillStyle = g; tx.fillRect(0, 0, xe, th_ * .505); }
    if (dp > 0) { const hw = tw_ * (.04 + .3 * dp), g = tx.createLinearGradient(tw_ / 2 - hw, 0, tw_ / 2 + hw, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.12, "#000"); g.addColorStop(.88, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); tx.fillStyle = g; tx.fillRect(tw_ / 2 - hw, th_ * .505, hw * 2, th_ * .5); }
    if (tp > 0 || dp > 0) { tx.globalCompositeOperation = "source-in"; tx.drawImage(img.text, 0, 0, tw_, th_); tx.globalCompositeOperation = "source-over"; thread(tc, L.tx, L.ty, L.tw, L.th); }
    /* shimmer over the gold thread only */
    const band = (u: number, al: number) => {
      if (u <= 0 || u >= 1) return; const gp = -w * .15 + w * 1.3 * u; gx.globalCompositeOperation = "source-over"; gx.clearRect(0, 0, w, h); const g = gx.createLinearGradient(gp - w * .11, 0, gp + w * .11, h * .3); g.addColorStop(0, "rgba(255,244,205,0)"); g.addColorStop(.5, "rgba(255,247,218,1)"); g.addColorStop(1, "rgba(255,244,205,0)"); gx.fillStyle = g; gx.fillRect(0, 0, w, h);
      gx.globalCompositeOperation = "destination-in"; gx.drawImage(lc, 0, 0); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = al * (1 - out); ctx.drawImage(gl, L.lx, L.ly, L.lw, L.lh); ctx.restore();
    };
    band((t - 2.5) / .9, .42); if (t > END) band(((t - END) % 3.8) / 1.2, .34);
    /* the sentence (the button), as the new reference without its light sweep (Kim): it breathes softly once done */
    if (t > END) {
      const br = .5 + .5 * Math.sin((t - END) * Math.PI * 2 / 2.6 - Math.PI / 2), cx = L.tx + L.tw * .5, cy = L.ty + L.th * .36, rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, L.tw * .56);
      rg.addColorStop(0, `rgba(255,246,222,${.30 + .22 * br})`); rg.addColorStop(1, "rgba(255,246,222,0)");
      ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = rg; ctx.fillRect(cx - L.tw * .6, cy - L.th * .5, L.tw * 1.2, L.th); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .10 + .12 * br; ctx.drawImage(tc, L.tx, L.ty, L.tw, L.th); ctx.restore();
    }
    /* the flower of the rule (Kim, the new reference): a faint glow behind it, and now and then a small glint */
    const fo = cl((t - 4.2) / .5);
    if (fo > 0) {
      const [fx, fy] = DATA.flower as number[], v = .5 + .5 * Math.sin(t * Math.PI * 2 / 2.2), x = L.tx + fx * L.tw, y = L.ty + fy * L.th, r = L.tw * .03;
      const fg = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6); fg.addColorStop(0, `rgba(255,246,220,${(.03 + .03 * v) * fo})`); fg.addColorStop(1, "rgba(255,246,220,0)");
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 7); ctx.fill(); ctx.restore();
      flare(ctx, x, y - r * .05, r * .3, .35 * Math.pow(v, 8) * fo);
    }
    /* gold glints on the sentence */
    const tpo = cl((t - 3.9) / .8);
    if (tpo > 0) (DATA.tpts as number[][]).forEach(([fx, fy], i) => { const v = Math.sin((t * (.45 + (i % 4) * .08) + i * .29) * Math.PI * 2), a = Math.pow(Math.max(0, v), 10); flare(ctx, L.tx + fx * L.tw, L.ty + fy * L.th, (4 + (i % 3) * 2) * L.tw / 600, a * .8 * tpo); });
    if (tip) flare(ctx, L.lx + tip[0] * L.lw / LWp, L.ly + tip[1] * L.lh / LHp, 12 * L.lw / 560, .8);
    const on = cl((t - 1.2) / 1.2); if (on > 0) for (const s of tw) { if (p >= 1 || s.fx < p * .95 - .04) { const v = Math.sin((t * s.sp + s.ph) * Math.PI * 2), a = Math.pow(Math.max(0, v), 10); flare(ctx, s.x, s.y, s.s * (.6 + .4 * a), a * .8 * on * (1 - out)); } }
    ctx.globalAlpha = 1;
  }

  /** the reference's size(): the canvas to the stage, the layout, and where the start button goes (CSS px) */
  function size(vw: number, vh: number, dpr: number) {
    VW = Math.max(1, vw); VH = Math.max(1, vh); DPR = Math.min(2, dpr || 1); cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); layout();
    return { left: OX + L.tx * SC, top: OY + (L.ty + L.th * .2) * SC, width: L.tw * SC, height: L.th * .36 * SC };
  }
  prep();
  return { size, frame };
}
