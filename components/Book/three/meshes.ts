// three.js geometry builders for the sleeve. The ribbon and its edging tubes are rebuilt in place
// (same vertex count) whenever the cover angle changes; see geometry.ts for the path itself.
import * as THREE from "three";
import { D, H, NS, SHEET_W, type PathPoint, type V2 } from "./geometry";

const NZ = 24; // rows along the book height: enough for smooth lighting, cheap to update

/** Two-sided fabric ribbon: outer (knit right side) and inner surface, extruded along Z. */
export function createRibbon(path: PathPoint[]) {
  const n = path.length, verts = 2 * n * (NZ + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(verts * 2), 2));
  const idx: number[] = [], at = (side: number, i: number, j: number) => side * n * (NZ + 1) + i * (NZ + 1) + j;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < NZ; j++) {
    const a = at(0, i, j), b = at(0, i + 1, j), c = at(0, i + 1, j + 1), d = at(0, i, j + 1);
    idx.push(a, d, b, b, d, c); // outer, facing +normal
    const A = at(1, i, j), B = at(1, i + 1, j), C = at(1, i + 1, j + 1), E = at(1, i, j + 1);
    idx.push(A, B, E, B, C, E); // inner, facing -normal
  }
  g.setIndex(idx);
  // material groups follow the path segments (0 back, 1 spine + joint, 2 front); quads are contiguous per i
  const per = NZ * 12; let start = 0;
  for (let i = 1; i < n; i++) {
    if (i === n - 1 || path[i].seg !== path[start].seg) { const end = i === n - 1 ? n - 1 : i; g.addGroup(start * per, (end - start) * per, path[start].seg); start = end; }
  }
  updateRibbon(g, path);
  return g;
}

export function updateRibbon(g: THREE.BufferGeometry, path: PathPoint[]) {
  const pos = g.attributes.position.array as Float32Array, nor = g.attributes.normal.array as Float32Array, uv = g.attributes.uv.array as Float32Array;
  const n = path.length;
  for (let side = 0; side < 2; side++) {
    const sg = side ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const { p, n: nn, u } = path[i];
      for (let j = 0; j <= NZ; j++) {
        const k = side * n * (NZ + 1) + i * (NZ + 1) + j, z = -D / 2 + (D * j) / NZ;
        pos[k * 3] = p[0] + nn[0] * H * sg; pos[k * 3 + 1] = p[1] + nn[1] * H * sg; pos[k * 3 + 2] = z;
        nor[k * 3] = nn[0] * sg; nor[k * 3 + 1] = nn[1] * sg; nor[k * 3 + 2] = 0;
        uv[k * 2] = u; uv[k * 2 + 1] = z; // centimetres; the texture repeat turns cm into stitches
      }
    }
  }
  g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.attributes.uv.needsUpdate = true;
  g.computeBoundingSphere();
}

const RADIAL = 12;

/** Crochet edging round along the sleeve's raw edge (z = zEdge), following the same path. */
export function createEdge(path: PathPoint[], zEdge: number, r: number) {
  const n = path.length, g = new THREE.BufferGeometry(), verts = n * (RADIAL + 1);
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(verts * 2), 2));
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < RADIAL; j++) {
    const a = i * (RADIAL + 1) + j, b = (i + 1) * (RADIAL + 1) + j;
    idx.push(a, a + 1, b, b, a + 1, b + 1); // outward-facing (ring runs n -> z around the tangent)
  }
  g.setIndex(idx);
  updateEdge(g, path, zEdge, r);
  return g;
}

export function updateEdge(g: THREE.BufferGeometry, path: PathPoint[], zEdge: number, r: number) {
  const pos = g.attributes.position.array as Float32Array, nor = g.attributes.normal.array as Float32Array, uv = g.attributes.uv.array as Float32Array;
  const circ = 2 * Math.PI * r;
  path.forEach(({ p, n, u }, i) => {
    for (let j = 0; j <= RADIAL; j++) {
      const f = (j / RADIAL) * Math.PI * 2, c = Math.cos(f), s = Math.sin(f), k = i * (RADIAL + 1) + j;
      const nx = n[0] * c, ny = n[1] * c, nz = s;
      pos[k * 3] = p[0] + nx * r; pos[k * 3 + 1] = p[1] + ny * r; pos[k * 3 + 2] = zEdge + nz * r;
      nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
      uv[k * 2] = u; uv[k * 2 + 1] = (j / RADIAL) * circ;
    }
  });
  g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.attributes.uv.needsUpdate = true;
  g.computeBoundingSphere();
}

// ---- paper sheets ----
const SZ = 2;
/** A sheet: NS segments along its width (spine -> fore edge), uv.x = 0 at the gutter, uv.y = 1 at the head. */
export function createSheet(depth: number) {
  const g = new THREE.BufferGeometry(), verts = (NS + 1) * (SZ + 1);
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
  const uv = new Float32Array(verts * 2), idx: number[] = [];
  for (let i = 0; i <= NS; i++) for (let j = 0; j <= SZ; j++) { const k = i * (SZ + 1) + j; uv[k * 2] = i / NS; uv[k * 2 + 1] = 1 - j / SZ; }
  for (let i = 0; i < NS; i++) for (let j = 0; j < SZ; j++) {
    const a = i * (SZ + 1) + j, b = (i + 1) * (SZ + 1) + j;
    idx.push(a, a + 1, b, b, a + 1, b + 1); // faces +normal (up while resting on the right)
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  g.userData.depth = depth;
  return g;
}

export function updateSheet(g: THREE.BufferGeometry, pts: V2[], heads: number[]) {
  const pos = g.attributes.position.array as Float32Array, nor = g.attributes.normal.array as Float32Array, depth = g.userData.depth as number;
  for (let i = 0; i <= NS; i++) {
    const a = heads[Math.min(NS - 1, Math.max(0, i - 1))] * 0.5 + heads[Math.min(NS - 1, i)] * 0.5;
    const nx = -Math.sin(a), ny = Math.cos(a);
    for (let j = 0; j <= SZ; j++) {
      const k = i * (SZ + 1) + j;
      pos[k * 3] = pts[i][0]; pos[k * 3 + 1] = pts[i][1]; pos[k * 3 + 2] = -depth / 2 + depth * j / SZ;
      nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = 0;
    }
  }
  g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.computeBoundingSphere();
}
export { SHEET_W };

// ---- cover border: open "ㄷ" tube with a fixed frame ----
/**
 * Tube along a flat open path (x, z) at height y. The cross-section is oriented against a fixed up
 * vector (the cover's normal) instead of three's Frenet frames, so the yarn pattern cannot twist.
 * uv.x runs along the tube in cm, scaled so the pattern repeats a whole number of times (tileCm).
 */
export function flatTube(pts: [number, number][], y: number, r: number, tileCm: number, radial = 16) {
  const n = pts.length, g = new THREE.BufferGeometry(), pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[n - 1], k = Math.max(1, Math.round(L / tileCm)), scale = (k * tileCm) / L, circ = 2 * Math.PI * r;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
    const side: [number, number] = [tz / tl, -tx / tl]; // in-plane, perpendicular to the path
    for (let j = 0; j <= radial; j++) {
      const f = (j / radial) * Math.PI * 2, c = Math.cos(f), s = Math.sin(f);
      const nx = side[0] * s, ny = c, nz = side[1] * s; // ring = up * cos + side * sin
      pos.push(pts[i][0] + nx * r, y + ny * r, pts[i][1] + nz * r); nor.push(nx, ny, nz); uv.push(cum[i] * scale, (j / radial) * circ);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  // make sure the triangles face outwards (winding depends on the path direction)
  g.computeBoundingSphere();
  return g;
}

/** "ㄷ" outline of a cover's border: head edge, fore edge, tail edge; open at the spine, ends tucked under it. */
export function borderPath(w: number, d: number, out: number, corner: number, tuck: number, step = 0.2): [number, number][] {
  const x0 = -w / 2 - tuck, x1 = w / 2 + out, z0 = -d / 2 - out, z1 = d / 2 + out, pts: [number, number][] = [];
  const line = (a: [number, number], b: [number, number]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(L / step)); for (let i = 0; i < m; i++) pts.push([a[0] + (b[0] - a[0]) * i / m, a[1] + (b[1] - a[1]) * i / m]); };
  const arc = (cx: number, cz: number, a0: number, a1: number) => { const m = 28; for (let i = 0; i < m; i++) { const a = a0 + (a1 - a0) * i / m; pts.push([cx + corner * Math.cos(a), cz + corner * Math.sin(a)]); } };
  line([x0, z0], [x1 - corner, z0]);                                  // head edge, from the spine to the fore edge
  arc(x1 - corner, z0 + corner, -Math.PI / 2, 0);                      // rounded corner
  line([x1, z0 + corner], [x1, z1 - corner]);                          // fore edge
  arc(x1 - corner, z1 - corner, 0, Math.PI / 2);
  line([x1 - corner, z1], [x0, z1]);                                   // tail edge, back to the spine
  pts.push([x0, z1]);
  return pts;
}
