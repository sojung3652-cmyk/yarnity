// Small procedural textures for the cloth hardcover: a very fine woven-cloth normal map, a paper-fibre
// normal map, and the CanvasTexture helper. Generated once and cached. Browser-only.
import * as THREE from "three";

const wrap = (i: number, n: number) => ((i % n) + n) % n;
const rnd = (seed: number) => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/** Tangent-space normal map (Sobel) from a wrapping height field. */
function normalFromHeight(H: Float32Array, n: number, strength: number) {
  const cv = document.createElement("canvas"); cv.width = n; cv.height = n;
  const ctx = cv.getContext("2d")!, img = ctx.createImageData(n, n), at = (x: number, y: number) => H[wrap(y, n) * n + wrap(x, n)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = -gx / 8 * strength, ny = gy / 8 * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const p = (y * n + x) * 4; img.data[p] = (nx * 0.5 + 0.5) * 255; img.data[p + 1] = (ny * 0.5 + 0.5) * 255; img.data[p + 2] = (nz * 0.5 + 0.5) * 255; img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

let clothCache: HTMLCanvasElement | null = null;
/** Book cloth: a fine plain weave (warp over weft), gentle. 16 threads per tile each way. */
export function clothNormal() {
  if (clothCache) return clothCache;
  const n = 128, H = new Float32Array(n * n), R = rnd(5), k = 16;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const a = Math.sin((x / n) * Math.PI * 2 * k), b = Math.sin((y / n) * Math.PI * 2 * k);
    H[y * n + x] = Math.max(a * (b > 0 ? 1 : 0.5), b * (a > 0 ? 0.5 : 1)) + (R() - 0.5) * 0.25;
  }
  return (clothCache = normalFromHeight(H, n, 1.2));
}

let paperCache: HTMLCanvasElement | null = null;
/** Paper: faint fibres. */
export function paperNormal() {
  if (paperCache) return paperCache;
  const n = 256, H = new Float32Array(n * n), R = rnd(23);
  for (let i = 0; i < n * n; i++) H[i] = R();
  for (let f = 0; f < 400; f++) {
    const x = R() * n, y = R() * n, a = R() * Math.PI, len = 6 + R() * 18;
    for (let t = 0; t < len; t++) H[wrap(Math.round(y + Math.sin(a) * t), n) * n + wrap(Math.round(x + Math.cos(a) * t), n)] += 1.2;
  }
  // soften (3x3 box, wrapping)
  const S = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += H[wrap(y + j, n) * n + wrap(x + i, n)]; S[y * n + x] = s / 9; }
  return (paperCache = normalFromHeight(S, n, 0.6));
}

let mottleCache: HTMLCanvasElement | null = null;
/** Cloth mottling: soft, low-frequency brightness variation of about +-3% (multiplied into the colour),
 *  so a cloth face is never a flat single colour. Wraps. */
export function mottleMap() {
  if (mottleCache) return mottleCache;
  const n = 256, cv = document.createElement("canvas"); cv.width = cv.height = n;
  const ctx = cv.getContext("2d")!, R = rnd(41);
  ctx.fillStyle = "rgb(247,247,247)"; ctx.fillRect(0, 0, n, n);
  for (let i = 0; i < 90; i++) {
    const x = R() * n, y = R() * n, r = 10 + R() * 38, v = R() < 0.5 ? 255 : 239, a = 0.25 + R() * 0.35;
    for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, `rgba(${v},${v},${v},${a})`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
      ctx.fillStyle = g; ctx.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r);
    }
  }
  return (mottleCache = cv);
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

let weaveCache: HTMLCanvasElement | null = null;
/** Web only (Kim): book cloth as a colour texture - a plain weave at one texel per thread (warp over weft),
 *  low contrast (about +-2%), slubbed threads, faint noise and the soft mottling on top. Also used as the
 *  cloth's bumpMap (tiny bumpScale), so the light picks out the same weave. 256px, made once. */
export function clothWeave() {
  if (weaveCache) return weaveCache;
  const n = 256, cv = document.createElement("canvas"); cv.width = cv.height = n;
  const ctx = cv.getContext("2d")!, img = ctx.createImageData(n, n), R = rnd(77);
  const row = Array.from({ length: n }, () => (R() - 0.5) * 5), col = Array.from({ length: n }, () => (R() - 0.5) * 5);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const over = (x + y) & 1, v = 246 + (over ? 4 + col[x] : -4 + row[y]) + (R() - 0.5) * 4;
    const p = (y * n + x) * 4; img.data[p] = img.data[p + 1] = img.data[p + 2] = Math.max(0, Math.min(255, v)); img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.globalCompositeOperation = "multiply"; ctx.drawImage(mottleMap(), 0, 0, n, n); ctx.globalCompositeOperation = "source-over";
  return (weaveCache = cv);
}

/** Web only: the spine band's own map (u across the band, v head..tail), one tone darker than the boards,
 *  the weave on it, two fine headband lines at the head and the tail, and a shallow dark groove at each
 *  hinge. `len`: the band's length across (cm) incl. the turn-ins `turn`; `band`: the band itself. */
export function spineMap(len: number, band: number, turn: number, depth: number) {
  const w = 256, h = 1024, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!, pat = ctx.createPattern(clothWeave(), "repeat")!;
  ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(60,44,34,.09)"; ctx.fillRect(0, 0, w, h); // one tone darker than the boards
  const pu = w / len, pv = h / depth;
  // headbands: two fine pressed lines near each end (a dark line, a light one under it)
  for (const at of [0.85, 1.12]) for (const end of [0, 1]) {
    const y = end ? h - at * pv : at * pv;
    ctx.fillStyle = "rgba(58,40,30,.26)"; ctx.fillRect(0, y - 1.5, w, 2.2);
    ctx.fillStyle = "rgba(255,250,240,.22)"; ctx.fillRect(0, y + (end ? -3.2 : 1), w, 1.4);
  }
  // hinge grooves: where the band meets each board, a shallow dark line about 1-2px on screen
  for (const u of [turn, turn + band]) {
    const x = u * pu, g = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
    g.addColorStop(0, "rgba(50,34,26,0)"); g.addColorStop(0.5, "rgba(50,34,26,.34)"); g.addColorStop(1, "rgba(50,34,26,0)");
    ctx.fillStyle = g; ctx.fillRect(x - 6, 0, 12, h);
  }
  return cv;
}
