// ---------- crochet sleeve textures ----------
// Ported verbatim from the prototype (legacy/index.html, `const Yarn = ...`); only types were added.
// CSS 3D has no lighting or normal maps, so the yarn relief is baked: every stitch is rasterised as
// twisted yarn strands into a height field, then lit once (matte Lambert + ambient occlusion) from the
// same top-left light the page shadow implies. The baked canvases are then used as the sleeve surfaces.
// Browser-only (document / ImageData): call from effects, never during render.

export type RGB = number[];
export interface Surface { w: number; h: number; H: Float32Array; A: Float32Array; M: Uint8Array }
type Allow = ((x: number, y: number, i: number) => boolean) | null;
type MapFn = (u: number, v: number) => [number, number];
type EdgeFn = (x: number, y: number) => [number, number, number];

export const Lv = [-0.42, -0.56, 0.71], Ln = Math.hypot(...Lv), L = Lv.map(c => c / Ln);
export const hex = (h: string): RGB => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const rnd = (seed: number) => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export function surface(w: number, h: number): Surface { return { w, h, H: new Float32Array(w * h), A: new Float32Array(w * h * 3), M: new Uint8Array(w * h) }; }
// one yarn strand: capsule with a rounded cross-section and diagonal ply twist
export function strand(S: Surface, x1: number, y1: number, x2: number, y2: number, r: number, col: RGB, z0: number, allow: Allow, phase: number) {
  const { w, h, H, A, M } = S, dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1e-6, len = Math.sqrt(L2), ux = dx / len, uy = dy / len;
  const pitch = r * 2.3, x0 = Math.max(0, Math.floor(Math.min(x1, x2) - r)), xe = Math.min(w - 1, Math.ceil(Math.max(x1, x2) + r));
  const y0 = Math.max(0, Math.floor(Math.min(y1, y2) - r)), ye = Math.min(h - 1, Math.ceil(Math.max(y1, y2) + r)), r2 = r * r;
  for (let y = y0; y <= ye; y++) for (let x = x0; x <= xe; x++) {
    const px = x + .5 - x1, py = y + .5 - y1; let t = (px * dx + py * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = px - t * dx, qy = py - t * dy, d2 = qx * qx + qy * qy; if (d2 >= r2) continue;
    const i = y * w + x; if (allow && !allow(x, y, i)) continue;
    const ac = Math.sqrt(d2) / r, sd = (qx * -uy + qy * ux) / r, prof = Math.sqrt(1 - ac * ac);
    const ply = .5 + .5 * Math.sin(6.2832 * (t * len / pitch + sd * .38) + phase);
    const z = z0 + r * prof * (.78 + .22 * ply);
    if (z > H[i]) { H[i] = z; M[i] = 1; const k = .9 + .1 * ply; A[i * 3] = col[0] * k; A[i * 3 + 1] = col[1] * k; A[i * 3 + 2] = col[2] * k; }
  }
}
// single crochet seen from the front: two slanted legs + the back loop of the top chain
export function stitch(S: Surface, map: MapFn, u: number, v: number, sw: number, rh: number, col: RGB, R: () => number, allow: Allow) {
  const ju = (R() - .5) * sw * .14, jv = (R() - .5) * rh * .14, t = .94 + R() * .1, sk = (R() - .5) * .08, c = col.map(x => x * t), ph = R() * 6.28;
  const P = (a: number, b: number) => map(u + ju + (a + sk * b) * sw, v + jv + b * rh), r = sw * (.19 + R() * .025);
  const tl = P(-.47, -.44), tr = P(.47, -.44); strand(S, tl[0], tl[1], tr[0], tr[1], sw * .12, c.map(x => x * .9), -r * .35, allow, ph);
  const a = P(-.06, .36), b = P(-.29, -.28), d = P(.06, .36), e = P(.29, -.28);
  strand(S, a[0], a[1], b[0], b[1], r, c, 0, allow, ph + 1.3); strand(S, d[0], d[1], e[0], e[1], r, c, 0, allow, ph + 2.9);
}
function boxBlur(src: Float32Array, w: number, h: number, rad: number) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), n = 2 * rad + 1;
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -rad; x <= rad; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[y * w + x] = s / n; s += src[y * w + Math.min(w - 1, x + rad + 1)] - src[y * w + Math.max(0, x - rad)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -rad; y <= rad; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s / n; s += tmp[Math.min(h - 1, y + rad + 1) * w + x] - tmp[Math.max(0, y - rad) * w + x]; } }
  return out;
}
// light the height field. photo: ImageData shown where there is no yarn. edge(x,y) -> [alpha, tiltX, tiltY]
function shade(S: Surface, photo: ImageData | null, edge: EdgeFn, aoRad: number, extraTilt?: ((x: number, y: number) => number) | null) {
  const { w, h, H, A, M } = S, B = boxBlur(H, w, h, aoRad), out = photo || new ImageData(w, h), o = out.data, R = rnd(7), sh = Math.max(1, Math.round(aoRad * .6));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 4, [al, tx, ty] = edge(x, y);
    if (al <= 0) { o[p + 3] = 0; continue; }
    if (M[i]) {
      let nx = -(H[i + (x < w - 1 ? 1 : 0)] - H[i - (x > 0 ? 1 : 0)]) * .55 + tx;
      const ny = -(H[i + (y < h - 1 ? w : 0)] - H[i - (y > 0 ? w : 0)]) * .55 + ty;
      if (extraTilt) nx += extraTilt(x, y);
      const nl = Math.max(0, (nx * L[0] + ny * L[1] + L[2]) / Math.hypot(nx, ny, 1));
      const lit = Math.min(1.08, .42 + .58 * nl / L[2]), ao = 1 - Math.min(1, Math.max(0, (B[i] - H[i]) / (aoRad * .9))) * .4, f = lit * ao * (1 + (R() - .5) * .045);
      o[p] = Math.min(255, A[i * 3] * f); o[p + 1] = Math.min(255, A[i * 3 + 1] * f); o[p + 2] = Math.min(255, A[i * 3 + 2] * f);
    } else if (photo) {
      const j = Math.max(0, y - sh) * w + Math.max(0, x - sh), s = 1 - Math.min(1, H[j] / (aoRad * .8)) * .32;
      o[p] *= s; o[p + 1] *= s; o[p + 2] *= s;
    }
    o[p + 3] = Math.round(255 * al);
  }
  return out;
}
// rounded-rect signed distance with outward direction
function rrect(x: number, y: number, w: number, h: number, rr: number): [number, number, number] {
  const cx = w / 2, cy = h / 2, qx = Math.abs(x - cx) - (cx - rr), qy = Math.abs(y - cy) - (cy - rr), sx = Math.sign(x - cx) || 1, sy = Math.sign(y - cy) || 1;
  let d: number, dx: number, dy: number; if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); d = l - rr; dx = sx * qx / l; dy = sy * qy / l; }
  else { d = Math.max(qx, qy) - rr; if (qx > qy) { dx = sx; dy = 0; } else { dx = 0; dy = sy; } }
  return [d, dx, dy];
}
export const LAV = hex("#D3C5EF"), GAP = hex("#AB97D0"), YEL = hex("#F3CB76");
function edgeFn(w: number, h: number, rr: number, sw: number, dpr: number, roll: number): EdgeFn {
  return (x, y) => {
    const [d, dx, dy] = rrect(x + .5, y + .5, w, h, rr), u = Math.abs(dy) > Math.abs(dx) ? x : y;
    const off = 1.1 * dpr * (.5 - .5 * Math.cos(6.2832 * u / sw)), dd = d + off;
    const al = Math.min(1, Math.max(0, .5 - dd)); if (al <= 0) return [0, 0, 0];
    const k = Math.max(0, 1 + dd / roll); return [al, dx * k * k * 1.6, dy * k * k * 1.6];
  };
}
export function A3(S: Surface, i: number, c: RGB) { S.A[i * 3] = c[0]; S.A[i * 3 + 1] = c[1]; S.A[i * 3 + 2] = c[2]; }

// front cover: crochet border worked in rounds around the cover panel + running stitch + slip-stitch join
function cover(Wc: number, Hc: number, img: HTMLImageElement, dpr: number) {
  const w = Math.round(Wc * dpr), h = Math.round(Hc * dpr), S = surface(w, h), R = rnd(11), sw = w / 38, rh = sw * .88, rows = 3;
  const band = rows * rh + sw * .25, rr = w * .035, p0 = band - rh * .12, px1 = w - p0, py1 = h - p0;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d")!;
  const pw = px1 - p0, ph = py1 - p0, s = Math.max(pw / img.naturalWidth, ph / img.naturalHeight), iw = img.naturalWidth * s, ih = img.naturalHeight * s;
  ctx.save(); ctx.beginPath(); ctx.rect(p0, p0, pw, ph); ctx.clip(); ctx.drawImage(img, p0 + (pw - iw) / 2, p0 + (ph - ih) / 2, iw, ih); ctx.restore();
  const photo = ctx.getImageData(0, 0, w, h), inPanel = (x: number, y: number) => x >= p0 && x < px1 && y >= p0 && y < py1;
  const region = (x: number, y: number) => { const m = Math.min(x, w - 1 - x, y, h - 1 - y); return m === y ? 0 : m === h - 1 - y ? 1 : m === x ? 2 : 3; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!inPanel(x, y)) { const i = y * w + x; S.M[i] = 1; A3(S, i, GAP); }
  const maps: MapFn[] = [(u, v) => [u, v], (u, v) => [w - u, h - v], (u, v) => [v, h - u], (u, v) => [w - v, u]], lens = [w, w, h, h];
  for (let g = 0; g < 4; g++) for (let row = 0; row < rows; row++) {
    const allow = (x: number, y: number) => region(x, y) === g && (!inPanel(x, y) || row === rows - 1), vc = rh * (row + .55), off = (row % 2) * sw * .5;
    for (let u = -sw + off; u < lens[g] + sw; u += sw) stitch(S, maps[g], u, vc, sw, rh, LAV, R, allow);
  }
  // slip-stitch join where the border meets the panel
  const jr = sw * .1, jl = sw * .5, edgeLine = (ax: number, ay: number, bx: number, by: number) => { const n = Math.floor(Math.hypot(bx - ax, by - ay) / jl); for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + .8) / n; strand(S, ax + (bx - ax) * t0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1, jr, GAP.map(c => c * 1.12), jr * .5, null, R() * 6); } };
  const j = p0 + jr * 1.4; edgeLine(j, j, w - j, j); edgeLine(j, h - j, w - j, h - j); edgeLine(j, j, j, h - j); edgeLine(w - j, j, w - j, h - j);
  // embroidered running stitch in yellow cotton floss, inside the panel
  const ins = p0 + sw * .85, dash = sw * .85, gap = sw * .42, fr = sw * .115;
  const run = (ax: number, ay: number, bx: number, by: number) => { const L0 = Math.hypot(bx - ax, by - ay), ex = (bx - ax) / L0, ey = (by - ay) / L0; for (let t = 0; t + dash <= L0; t += dash + gap) { const jit = (R() - .5) * fr * .6; strand(S, ax + ex * t - ey * jit, ay + ey * t + ex * jit, ax + ex * (t + dash) - ey * jit, ay + ey * (t + dash) + ex * jit, fr, YEL, fr * .4, inPanel, R() * 6); } };
  run(ins, ins, w - ins, ins); run(w - ins, ins, w - ins, h - ins); run(w - ins, h - ins, ins, h - ins); run(ins, h - ins, ins, ins);
  ctx.putImageData(shade(S, photo, edgeFn(w, h, rr, sw, dpr, sw * .55), Math.max(2, Math.round(sw * .2))), 0, 0);
  return cv;
}
// plain crochet fabric (spine, inside of the cover). rowsAlongY = rows run along the long side
function fabric(Wc: number, Hc: number, dpr: number, rowsAlongY: boolean, curve: boolean, seed: number) {
  const w = Math.max(4, Math.round(Wc * dpr)), h = Math.max(4, Math.round(Hc * dpr)), S = surface(w, h), R = rnd(seed), sw = (rowsAlongY ? h : w) / (rowsAlongY ? 56 : 50), rh = sw * .88;
  for (let i = 0; i < w * h; i++) { S.M[i] = 1; A3(S, i, GAP); }
  const map: MapFn = rowsAlongY ? (u, v) => [v, u] : (u, v) => [u, v], U = rowsAlongY ? h : w, V = rowsAlongY ? w : h;
  for (let row = 0, v = rh * .5; v < V + rh; row++, v += rh) for (let u = -sw + (row % 2) * sw * .5; u < U + sw; u += sw) stitch(S, map, u, v, sw, rh, LAV, R, null);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const rr = Math.min(w, h) * (curve ? .2 : .03), tilt = curve ? (x: number) => (2 * (x + .5) / w - 1) * 1.15 : null;
  cv.getContext("2d")!.putImageData(shade(S, null, edgeFn(w, h, rr, sw, dpr, sw * .45), Math.max(2, Math.round(sw * .2)), tilt), 0, 0);
  return cv;
}

export const Yarn = { cover, fabric };
