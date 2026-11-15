// PBR maps for the knit cover, generated from the same yarn height field as the CSS book
// (components/Book/yarnTexture.ts: strand = a twisted yarn capsule rasterised into a height field).
// From the height field we derive, instead of one baked lit image:
//   colour   yarn colour with per-stitch tint and ply shading (sRGB)
//   normal   Sobel of the height field (tangent space)
//   ORM      R = ambient occlusion (gaps between stitches darker), G = roughness 0.9..0.98, B = 0
// Tiles wrap seamlessly so they repeat at real stitch size. Built once per page load and cached.
import * as THREE from "three";
import { hex, rnd, strand, surface, type RGB, type Surface } from "../yarnTexture";

const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** Draw a strand plus its wrapped copies (seamless tile). */
function strandWrap(S: Surface, x1: number, y1: number, x2: number, y2: number, r: number, col: RGB, z0: number, ph: number) {
  for (const dx of [-S.w, 0, S.w]) for (const dy of [-S.h, 0, S.h]) strand(S, x1 + dx, y1 + dy, x2 + dx, y2 + dy, r, col, z0, null, ph);
}

function base(S: Surface, c: RGB) { for (let i = 0; i < S.w * S.h; i++) { S.M[i] = 1; S.A[i * 3] = c[0]; S.A[i * 3 + 1] = c[1]; S.A[i * 3 + 2] = c[2]; } }
function tinted(c: RGB, R: () => number, amt = 0.06): RGB { const t = 1 + (R() - 0.5) * amt, h = (R() - 0.5) * amt * 0.5; return [c[0] * t * (1 + h), c[1] * t, c[2] * t * (1 - h)]; }

/**
 * Stockinette (메리야스): columns of V-shaped stitches, each V = two plump slanted loops.
 * u (x) runs across the columns, v (y, downwards on the canvas) along a column; V points down.
 */
function stockinette(cols: number, rows: number, cw: number, yarn: RGB, gap: RGB, seed: number): Surface {
  const rh = Math.round(cw * 0.78), S = surface(cols * cw, rows * rh), R = rnd(seed);
  base(S, gap);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = (c + 0.5) * cw, cy = r * rh, col = tinted(yarn, R), rad = cw * 0.25, ph = R() * 6.28;
    // left leg: from upper-left down to the centre, right leg mirrored; each loop overlaps the row below
    strandWrap(S, cx - cw * 0.42, cy - rh * 0.05, cx - cw * 0.04, cy + rh * 1.02, rad, col, 0, ph);
    strandWrap(S, cx + cw * 0.42, cy - rh * 0.05, cx + cw * 0.04, cy + rh * 1.02, rad, col.map(x => x * 0.97), 0, ph + 2.1);
  }
  return S;
}

/**
 * Braided chain border: V links pointing along u (the tube length), two columns around the tube
 * (v = circumference), like the twisted crochet edging in the reference photo.
 */
function chain(links: number, lw: number, circ: number, yarn: RGB, gap: RGB, seed: number): Surface {
  const S = surface(links * lw, circ), R = rnd(seed);
  base(S, gap);
  for (const vc of [0.25, 0.75]) for (let k = 0; k < links; k++) {
    const x = k * lw + (vc > 0.5 ? lw * 0.5 : 0), y = vc * circ, hw = circ * 0.22, col = tinted(yarn, R, 0.08), rad = lw * 0.36, ph = R() * 6.28;
    strandWrap(S, x - lw * 0.15, y - hw, x + lw * 0.95, y - hw * 0.08, rad, col, 0, ph);
    strandWrap(S, x - lw * 0.15, y + hw, x + lw * 0.95, y + hw * 0.08, rad, col.map(v => v * 0.96), 0, ph + 1.7);
  }
  return S;
}

function blurWrap(src: Float32Array, w: number, h: number, rad: number) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), n = 2 * rad + 1;
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -rad; x <= rad; x++) s += src[y * w + wrap(x, w)]; for (let x = 0; x < w; x++) { tmp[y * w + x] = s / n; s += src[y * w + wrap(x + rad + 1, w)] - src[y * w + wrap(x - rad, w)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -rad; y <= rad; y++) s += tmp[wrap(y, h) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s / n; s += tmp[wrap(y + rad + 1, h) * w + x] - tmp[wrap(y - rad, h) * w + x]; } }
  return out;
}

function toCanvas(w: number, h: number, fill: (i: number, o: Uint8ClampedArray, p: number) => void) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!, img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) fill(i, img.data, i * 4);
  ctx.putImageData(img, 0, 0);
  return cv;
}

export interface Maps { color: HTMLCanvasElement; normal: HTMLCanvasElement; orm: HTMLCanvasElement }

/** Normal (Sobel), AO and roughness from a height field; optional albedo. */
export function mapsFromHeight(w: number, h: number, H: Float32Array, A: Float32Array | null, cell: number, opts: { normal?: number; ao?: number } = {}): Maps {
  const k = opts.normal ?? 1, aoK = opts.ao ?? 0.6;
  const aoRad = Math.max(2, Math.round(cell * 0.22)), B = blurWrap(H, w, h, aoRad), R = rnd(17);
  const at = (x: number, y: number) => H[wrap(y, h) * w + wrap(x, w)];
  const ao = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) ao[i] = 1 - Math.min(1, Math.max(0, (B[i] - H[i]) / (aoRad * 0.9))) * aoK;
  const color = toCanvas(w, h, (i, o, p) => {
    const cav = 0.6 + 0.4 * ao[i]; // a little cavity darkening in the albedo for direct light
    o[p] = A ? Math.min(255, A[i * 3] * cav) : 255; o[p + 1] = A ? Math.min(255, A[i * 3 + 1] * cav) : 255; o[p + 2] = A ? Math.min(255, A[i * 3 + 2] * cav) : 255; o[p + 3] = 255;
  });
  const normal = toCanvas(w, h, (i, o, p) => {
    const x = i % w, y = (i / w) | 0;
    // canvas y grows downwards, texture v upwards (flipY): hence the sign of ny
    const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = (-gx / 8) * k, ny = (gy / 8) * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    o[p] = (nx * 0.5 + 0.5) * 255; o[p + 1] = (ny * 0.5 + 0.5) * 255; o[p + 2] = (nz * 0.5 + 0.5) * 255; o[p + 3] = 255;
  });
  const orm = toCanvas(w, h, (i, o, p) => {
    const rough = 0.9 + 0.06 * (1 - ao[i]) / Math.max(0.01, aoK) + (R() - 0.5) * 0.03; // matte cotton
    o[p] = ao[i] * 255; o[p + 1] = Math.min(0.98, Math.max(0.9, rough)) * 255; o[p + 2] = 0; o[p + 3] = 255;
  });
  return { color, normal, orm };
}

// ---- real sizes (cm) of one tile, for texture.repeat with uv in cm ----
export const STITCH_CM = 0.42;              // stockinette stitch width
export const CHAIN_LINK_CM = 0.4;           // one V link of the border along the tube

const cache: Record<string, { maps: Maps; tileCm: [number, number] }> = {};

/** Cream stockinette (front/back) or lavender stockinette (spine). */
export function knit(kind: "cream" | "lavender") {
  if (cache[kind]) return cache[kind];
  const cw = 40, cols = 10, rows = 12, rh = Math.round(cw * 0.78);
  const S = kind === "cream" ? stockinette(cols, rows, cw, hex("#FBEFE3"), hex("#E2CFBE"), 3) : stockinette(cols, rows, cw, hex("#C6B4E6"), hex("#9F89CC"), 9);
  cache[kind] = { maps: mapsFromHeight(S.w, S.h, S.H, S.A, cw), tileCm: [cols * STITCH_CM, rows * STITCH_CM * (rh / cw)] };
  return cache[kind];
}

/** Lavender braided chain for the border tubes: 6 links along, full circumference across. */
export function chainBorder(circumferenceCm: number) {
  if (cache.chain) return cache.chain;
  const lw = 40, links = 6, circ = Math.round(lw * circumferenceCm / CHAIN_LINK_CM);
  const S = chain(links, lw, circ, hex("#C2AEE4"), hex("#9B85C9"), 5);
  cache.chain = { maps: mapsFromHeight(S.w, S.h, S.H, S.A, lw, { normal: 1.2, ao: 0.65 }), tileCm: [links * CHAIN_LINK_CM, circumferenceCm] };
  return cache.chain;
}

/** Height from image brightness -> normal map, so the embroidered picture's stitches stand out. */
export function imageNormal(img: HTMLImageElement | ImageBitmap, maxW = 1024): HTMLCanvasElement {
  const w = Math.min(maxW, img.width), h = Math.round(img.height * w / img.width);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!; ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data, Hh = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) Hh[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255 * 6; // brighter = higher yarn
  const smoothH = blurWrap(Hh, w, h, 1);
  return mapsFromHeight(w, h, smoothH, null, 6, { normal: 1.6, ao: 0.4 }).normal;
}

/** Fine paper fibre noise (normal map) for the pages. */
let paperCache: HTMLCanvasElement | null = null;
export function paperNormal() {
  if (paperCache) return paperCache;
  const n = 256, Hh = new Float32Array(n * n), R = rnd(23);
  for (let i = 0; i < n * n; i++) Hh[i] = R();
  // a few elongated fibres
  for (let f = 0; f < 400; f++) {
    const x = R() * n, y = R() * n, a = R() * Math.PI, len = 6 + R() * 18;
    for (let t = 0; t < len; t++) { const xi = wrap(Math.round(x + Math.cos(a) * t), n), yi = wrap(Math.round(y + Math.sin(a) * t), n); Hh[yi * n + xi] += 1.2; }
  }
  paperCache = mapsFromHeight(n, n, blurWrap(Hh, n, n, 1), null, 4, { normal: 0.6 }).normal;
  return paperCache;
}

/** Cloth weave for the label. */
let weaveCache: HTMLCanvasElement | null = null;
export function weaveNormal() {
  if (weaveCache) return weaveCache;
  const n = 64, Hh = new Float32Array(n * n), R = rnd(5);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const a = Math.sin((x / n) * Math.PI * 16), b = Math.sin((y / n) * Math.PI * 16);
    Hh[y * n + x] = 1.2 * Math.max(a * (b > 0 ? 1 : 0.4), b * (a > 0 ? 0.4 : 1)) + R() * 0.2;
  }
  weaveCache = mapsFromHeight(n, n, Hh, null, 8).normal;
  return weaveCache;
}

export function canvasTexture(cv: HTMLCanvasElement, srgb: boolean, gl: THREE.WebGLRenderer, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = gl.capabilities.getMaxAnisotropy();
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
