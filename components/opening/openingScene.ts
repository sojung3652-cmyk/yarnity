// The embroidered opening (Kim): reference.html's drawing, moved here as it is. The numbers, coordinates and
// timings are the reference's own and are not to be changed (Kim): IW/IH/Y0/CH/END, the handwriting strokes
// (RAW), the twinkle points (lib/data/opening-points.json, the reference's PTS), the brush, the sentence and
// divider reveals, the light band over the gold thread, the stitching tip, the twinkles, the slow zoom.
// Only what was global in the reference (its canvas and its images) comes in as arguments.
import PTS from "@/lib/data/opening-points.json";

export const IW = 941, IH = 1672, Y0 = 905, CH = 510, END = 4.75;
export const SRC = { base: "/opening/base.jpg", top: "/opening/top.jpg", mask: "/opening/mask.png", gold: "/opening/gold.png" } as const;
export type OpeningImages = Record<keyof typeof SRC, HTMLImageElement>;

const cl = (x: number) => Math.min(1, Math.max(0, x)), soft = (x: number) => 1 - Math.pow(1 - cl(x), 1.7);
/* handwriting order of the logo, in image px */
const RAW: number[][][] = [[[205, 200], [170, 240], [110, 250], [55, 220], [35, 170], [60, 115], [120, 85], [190, 80], [250, 105], [285, 160], [295, 230], [292, 300], [300, 335]],
  [[655, 155], [690, 175], [750, 160], [795, 110], [790, 50], [740, 12], [660, 12], [580, 45], [500, 110], [430, 200], [370, 290], [310, 370], [240, 440], [160, 500], [80, 525], [25, 500], [10, 450], [40, 390], [110, 355], [190, 360], [280, 395], [380, 440], [480, 470], [560, 482], [600, 480]],
  [[485, 262], [430, 250], [390, 290], [370, 350], [392, 380], [430, 360], [470, 300], [492, 255], [480, 330], [490, 380], [522, 368]],
  [[562, 250], [540, 320], [520, 390], [550, 300], [592, 255], [632, 262]],
  [[672, 250], [650, 320], [635, 390], [665, 300], [710, 255], [750, 260], [760, 300], [745, 360], [760, 385], [792, 364]],
  [[852, 250], [830, 320], [815, 375], [840, 390], [866, 364]], [[858, 186], [862, 194]],
  [[957, 185], [935, 270], [915, 350], [916, 386], [947, 374]], [[820, 250], [1005, 250]],
  [[1000, 250], [1010, 310], [1020, 380], [1026, 402]],
  [[1068, 232], [1100, 215], [1110, 250], [1090, 300], [1050, 360], [1010, 420], [960, 480], [880, 525], [780, 545], [680, 535], [622, 505], [602, 475], [630, 440], [700, 425], [800, 430], [900, 460], [980, 500], [1060, 530], [1130, 537], [1192, 510]],
  [[1120, 392], [1060, 410], [1042, 462], [1068, 516], [1124, 534], [1178, 510], [1196, 458], [1172, 408], [1120, 392], [1090, 440], [1100, 490], [1150, 500], [1160, 440], [1120, 430]],
  [[909, 45], [909, 150]], [[870, 97], [946, 97]]];
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
const SP = RAW.map(s => { const p = s.map(([x, y]) => [172 + x * .494, 932 - Y0 + y * .453]), sm = [p[0]]; for (let i = 1; i < p.length - 1; i++) sm.push(...quad([(p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2], p[i], [(p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2])); sm.push(p[p.length - 1]); return resample(sm, 2); });
const STOT = SP.reduce((a, p) => a + p.len, 0);
const tw = (PTS as number[][]).map(([x, y], i) => ({ x, y: y, ph: (i * 0.618) % 1, sp: .5 + ((i * 7) % 5) * .09, s: 5 + ((i * 3) % 4) * 2.2 }));

function flare(c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (a <= .01) return; c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = a;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(255,250,225,1)"); g.addColorStop(.25, "rgba(249,233,186,.55)"); g.addColorStop(1, "rgba(247,222,158,0)"); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.strokeStyle = "rgba(255,250,228,.95)"; c.lineCap = "round"; c.lineWidth = Math.max(.6, r * .09); c.beginPath(); c.moveTo(x - r * 1.5, y); c.lineTo(x + r * 1.5, y); c.moveTo(x, y - r * 1.5); c.lineTo(x, y + r * 1.5); c.stroke();
  c.lineWidth = Math.max(.4, r * .05); c.beginPath(); c.moveTo(x - r * .6, y - r * .6); c.lineTo(x + r * .6, y + r * .6); c.moveTo(x + r * .6, y - r * .6); c.lineTo(x - r * .6, y + r * .6); c.stroke(); c.restore();
}

/** the reference's frame(t), drawing onto `cv` with the loaded images */
export function makeFrame(cv: HTMLCanvasElement, img: OpeningImages) {
  const ctx = cv.getContext("2d")!;
  const mk = () => document.createElement("canvas"), ov = mk(), ox = ov.getContext("2d")!, br = mk(), bx = br.getContext("2d")!, gl = mk(), gx = gl.getContext("2d")!;
  [ov, br, gl].forEach(c => { c.width = IW; c.height = CH; });
  let tip: number[] | null = null;
  return function frame(t: number) {
    t += .45; const W = cv.width, H = cv.height, k = W / IW, z = 1 + .035 * Math.sin(Math.PI / 2 * cl(t / 6));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#F3E7DC"; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(k * z, 0, 0, k * z, W / 2 * (1 - z), H * .62 * (1 - z));
    ctx.drawImage(img.base, 0, 0, IW, IH);
    /* reveal brush: logo strokes, then the sentence, then the divider */
    bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, IW, CH); bx.lineCap = "round"; bx.lineJoin = "round"; bx.strokeStyle = "#000"; bx.fillStyle = "#000"; bx.lineWidth = 34;
    const p = soft((t - .6) / 2.5); let rem = STOT * p; tip = null;
    for (const P of SP) { if (rem <= 0) break; const n = Math.min(P.n - 1, Math.floor(rem / P.step)); bx.beginPath(); bx.moveTo(P.x[0], P.y[0]); for (let i = 1; i <= n; i++) bx.lineTo(P.x[i], P.y[i]); if (n < 1) bx.lineTo(P.x[0] + .01, P.y[0]); bx.stroke(); if (rem < P.len) tip = [P.x[n], P.y[n]]; rem -= P.len; }
    if (p >= 1) bx.fillRect(140, 0, 660, 1195 - Y0);
    const tp = soft((t - 3.15) / 1.05); if (tp > 0) { const x0 = 150, x1 = 800, xe = x0 + (x1 - x0 + 60) * tp, g = bx.createLinearGradient(xe - 60, 0, xe, 0); g.addColorStop(0, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); bx.fillStyle = g; bx.fillRect(x0, 1210 - Y0, xe - x0, 85); bx.fillStyle = "#000"; }
    const dp = soft((t - 4.15) / .85); if (dp > 0) { const cx = 470, hw = 230 * dp + 20, g = bx.createLinearGradient(cx - hw, 0, cx + hw, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(.12, "#000"); g.addColorStop(.88, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); bx.fillStyle = g; bx.fillRect(cx - hw, 1305 - Y0, hw * 2, 100); bx.fillStyle = "#000"; }
    ox.globalCompositeOperation = "source-over"; ox.clearRect(0, 0, IW, CH); ox.drawImage(br, 0, 0);
    ox.globalCompositeOperation = "source-in"; ox.drawImage(img.mask, 0, 0, IW, CH); ox.drawImage(img.top, 0, 0, IW, CH); ox.globalCompositeOperation = "source-over";
    ctx.drawImage(ov, 0, Y0);
    /* shimmer: a soft light band travelling over the gold thread, only where thread is */
    const band = (u: number, al: number) => {
      if (u <= 0 || u >= 1) return; const gxp = 120 + 700 * u; gx.globalCompositeOperation = "source-over"; gx.clearRect(0, 0, IW, CH); const g = gx.createLinearGradient(gxp - 70, 0, gxp + 70, 50); g.addColorStop(0, "rgba(251,242,209,0)"); g.addColorStop(.5, "rgba(252,244,217,1)"); g.addColorStop(1, "rgba(251,242,209,0)"); gx.fillStyle = g; gx.fillRect(0, 0, IW, 1200 - Y0);
      gx.globalCompositeOperation = "destination-in"; gx.drawImage(img.gold, 0, 0, IW, CH); gx.globalCompositeOperation = "destination-in"; gx.drawImage(br, 0, 0); ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = al; ctx.drawImage(gl, 0, Y0); ctx.restore();
    };
    band((t - 2.95) / .9, .42); if (t > END) { const c = ((t - END) % 3.6) / 1.2; band(c, .34); }
    /* tip of the thread catches the light while it is being stitched */
    if (tip) { flare(ctx, tip[0], tip[1] + Y0, 12, .8); }
    /* twinkles on the finished thread */
    const on = cl((t - 1.4) / 1.2); if (on > 0) for (const s of tw) { if (s.x < 172 + (p < 1 ? (STOT * p / STOT) * 600 - 40 : 9999)) { const v = Math.sin((t * s.sp + s.ph) * Math.PI * 2), a = Math.pow(Math.max(0, v), 10); flare(ctx, s.x, s.y, s.s * (.6 + .4 * a), a * .8 * on); } }
  };
}
