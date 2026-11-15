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

/** Closed tube along a flat loop (panel join, running-stitch guide). Points are (x, z) at height y. */
export function loopTube(pts: [number, number][], y: number, r: number, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)), true, "centripetal");
  const len = curve.getLength(), g = new THREE.TubeGeometry(curve, Math.max(64, Math.round(len * 6)), r, radial, true);
  // uv.x along the loop in cm (TubeGeometry gives 0..1)
  const uv = g.attributes.uv.array as Float32Array;
  for (let i = 0; i < uv.length; i += 2) { uv[i] *= len; uv[i + 1] *= 2 * Math.PI * r; }
  return g;
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
