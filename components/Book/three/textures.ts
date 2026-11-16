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

export function canvasTexture(cv: HTMLCanvasElement, srgb: boolean, gl: THREE.WebGLRenderer, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = gl.capabilities.getMaxAnisotropy();
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
