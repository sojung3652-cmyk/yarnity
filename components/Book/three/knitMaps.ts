// PBR maps for the crochet sleeve, generated from the same yarn height field as the CSS book
// (components/Book/yarnTexture.ts: strand = twisted yarn capsule, stitch = single crochet).
// Instead of baking one lit image, the height field becomes:
//   colour   lavender yarn, slight per-stitch and per-ply variation (sRGB)
//   normal   Sobel of the height field, in the stitch direction (tangent space)
//   ORM      R = ambient occlusion (gaps between stitches darker), G = roughness 0.85..0.95, B = 0 metal
// The tile wraps seamlessly, so it can repeat at real stitch size across the whole cover.
// Built once per page load and cached (module scope).
import * as THREE from "three";
import { GAP, hex, LAV, rnd, stitch, surface, type RGB, type Surface } from "../yarnTexture";

export interface KnitMaps { color: HTMLCanvasElement; normal: HTMLCanvasElement; orm: HTMLCanvasElement; tileCm: [number, number] }

export const STITCH_CM = 0.4; // stitch width on the sleeve: the CSS cover has 38 stitches across 15cm (~0.4cm)

const wrap = (i: number, n: number) => ((i % n) + n) % n;

/** Seamless tile of single crochet rows (each row offset by half a stitch, as in the CSS fabric). */
function knitSurface(cols: number, rows: number, sw: number, seed: number, base: RGB, yarn: RGB): Surface {
  const rh = Math.round(sw * 0.88), w = cols * sw, h = rows * rh, S = surface(w, h);
  for (let i = 0; i < w * h; i++) { S.M[i] = 1; S.A[i * 3] = base[0]; S.A[i * 3 + 1] = base[1]; S.A[i * 3 + 2] = base[2]; }
  const id = (u: number, v: number): [number, number] => [u, v];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const u = c * sw + (r % 2) * sw * 0.5, v = rh * (r + 0.5), s = seed * 7919 + r * 131 + c;
    // per-stitch yarn tint: real yarn is never perfectly even
    const tr = rnd(s * 3 + 1), tint = 1 + (tr() - 0.5) * 0.06, hue = (tr() - 0.5) * 0.035;
    const col: RGB = [yarn[0] * tint * (1 + hue), yarn[1] * tint, yarn[2] * tint * (1 - hue)];
    // draw the stitch and its wrapped copies with the same random stream, so the tile is seamless
    for (const du of [-w, 0, w]) for (const dv of [-h, 0, h]) stitch(S, id, u + du, v + dv, sw, rh, col, rnd(s), null);
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

export function mapsFromSurface(S: Surface, sw: number, opts: { normalStrength?: number; aoStrength?: number } = {}) {
  const { w, h, H, A } = S, k = opts.normalStrength ?? 1, aoK = opts.aoStrength ?? 0.6;
  const aoRad = Math.max(2, Math.round(sw * 0.22)), B = blurWrap(H, w, h, aoRad), R = rnd(17);
  const at = (x: number, y: number) => H[wrap(y, h) * w + wrap(x, w)];
  const ao = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) ao[i] = 1 - Math.min(1, Math.max(0, (B[i] - H[i]) / (aoRad * 0.9))) * aoK;

  const color = toCanvas(w, h, (i, o, p) => {
    const cav = 0.55 + 0.45 * ao[i]; // a little cavity darkening in the albedo too, for direct light
    o[p] = Math.min(255, A[i * 3] * cav); o[p + 1] = Math.min(255, A[i * 3 + 1] * cav); o[p + 2] = Math.min(255, A[i * 3 + 2] * cav); o[p + 3] = 255;
  });
  const normal = toCanvas(w, h, (i, o, p) => {
    const x = i % w, y = (i / w) | 0;
    // Sobel; canvas y grows downwards while texture v grows upwards (flipY), hence the sign of ny
    const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
    const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
    let nx = (-gx / 8) * k, ny = (gy / 8) * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    o[p] = (nx * 0.5 + 0.5) * 255; o[p + 1] = (ny * 0.5 + 0.5) * 255; o[p + 2] = (nz * 0.5 + 0.5) * 255; o[p + 3] = 255;
  });
  const orm = toCanvas(w, h, (i, o, p) => {
    // fluffy fibres scatter light: completely matte, a touch rougher in the gaps
    const rough = 0.85 + 0.07 * (1 - ao[i]) / Math.max(0.01, aoK) + (R() - 0.5) * 0.04;
    o[p] = ao[i] * 255; o[p + 1] = Math.min(0.95, Math.max(0.85, rough)) * 255; o[p + 2] = 0; o[p + 3] = 255;
  });
  return { color, normal, orm };
}

let cache: KnitMaps | null = null;
/** Main sleeve fabric: 10 stitches x 12 rows per tile. */
export function knitMaps(): KnitMaps {
  if (cache) return cache;
  const sw = 48, cols = 10, rows = 12, S = knitSurface(cols, rows, sw, 3, GAP, LAV);
  const rh = Math.round(sw * 0.88);
  cache = { ...mapsFromSurface(S, sw), tileCm: [cols * STITCH_CM, rows * STITCH_CM * (rh / sw)] };
  return cache;
}

/** Fine plain-weave cloth (embroidery ground of the picture panel, cloth label). */
let weaveCache: { normal: HTMLCanvasElement } | null = null;
export function weaveMaps() {
  if (weaveCache) return weaveCache;
  const n = 64, S = surface(n, n), R = rnd(5);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const warp = Math.sin((x / n) * Math.PI * 16), weft = Math.sin((y / n) * Math.PI * 16);
    S.H[y * n + x] = 1.2 * Math.max(warp * (weft > 0 ? 1 : 0.4), weft * (warp > 0 ? 0.4 : 1)) + R() * 0.2;
  }
  weaveCache = { normal: mapsFromSurface(S, 8, { normalStrength: 1 }).normal };
  return weaveCache;
}

export const YELLOW = hex("#F3CB76");

export function canvasTexture(cv: HTMLCanvasElement, srgb: boolean, gl: THREE.WebGLRenderer, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = gl.capabilities.getMaxAnisotropy();
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  return t;
}
