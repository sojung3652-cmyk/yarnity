// Geometry of the WebGL book. Pure math (no three.js), so it can be unit-tested.
//
// Units: centimetres. Book frame: lying on a table, front cover facing +Y, spine on the left (-X),
// top edge of the book at -Z (so the camera, sitting on the +Z side, reads it upright).
// The crochet sleeve is modelled as one fabric ribbon: its cross-section (a 2-D path in the XY plane)
// is extruded along Z. The path runs
//   back flap -> back fore-edge fold -> back -> rounded spine -> JOINT -> front -> front fold -> front flap
// and everything after the joint turns with the front cover. Recomputing the path for each opening
// angle makes the joint bend like real fabric, and the ribbon can never separate from the boards.

export const W = 15;          // cover width
export const D = 20;          // cover height (along Z)
export const T = 3.5;         // book thickness, board outside to board outside
export const BOARD = 0.25;    // board thickness
export const FAB = 0.25;      // knit sleeve thickness
export const H = FAB / 2;     // fabric half thickness (path = fabric centre line)
export const SQUARE = 0.25;   // pages are inset this much from the boards
export const SPINE_RX = 0.9;  // how far the rounded spine bulges out
export const FLAP = 0.24 * W; // sleeve flap tucked inside each cover
export const RHO = 0.35;      // bend radius of the fabric at the front joint
export const EDGE_R = H + 0.05; // crochet edging round (tube) radius: thin, about 3.5mm across

/** Pivot of the front cover: the joint bends around this point (just above the cover at the spine). */
export const PIVOT: V2 = [-W / 2, T + H + RHO];

export type V2 = [number, number];

const rot = (p: V2, a: number, c: V2 = PIVOT): V2 => {
  const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * k - y * s, c[1] + x * s + y * k];
};

export interface PathPoint { p: V2; n: V2; u: number; front: boolean }

const N_FLAP = 6, N_FOLD = 14, N_FLAT = 24, N_SPINE = 28, N_JOINT = 16;
// The joint always gets this much texture length, whatever its real length, so stitches on the
// front never slide while the cover opens (the fabric just bunches or stretches at the joint).
const JOINT_U = Math.PI * RHO;

function arc(c: V2, rx: number, ry: number, a0: number, a1: number, n: number): [V2, V2][] {
  const out: [V2, V2][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    out.push([[c[0] + rx * Math.cos(a), c[1] + ry * Math.sin(a)], [0, 0]]);
  }
  return out;
}
function line(a: V2, b: V2, n: number): [V2, V2][] {
  const out: [V2, V2][] = [];
  for (let i = 0; i <= n; i++) { const t = i / n; out.push([[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], [0, 0]]); }
  return out;
}

/** Front part (joint end -> front -> fold -> flap) in its closed position, then turned by `angle`. */
function frontPath(angle: number): [V2, V2][] {
  const yTop = T + H, yIn = T - BOARD - H, fc: V2 = [W / 2, T - BOARD / 2], fr = BOARD / 2 + H;
  const pts = [
    ...line([-W / 2, yTop], [W / 2, yTop], N_FLAT).slice(1),
    ...arc(fc, fr, fr, Math.PI / 2, -Math.PI / 2, N_FOLD).slice(1),
    ...line([W / 2, yIn], [W / 2 - FLAP, yIn], N_FLAP).slice(1),
  ];
  return withNormals(pts).map(([p, n]) => [rot(p, angle), rot(n, angle, [0, 0])]);
}

/** Right-hand normal of the travel direction = the knit's right side (outside of the sleeve). */
function withNormals(pts: [V2, V2][]): [V2, V2][] {
  return pts.map(([p], i) => {
    const a = pts[Math.max(0, i - 1)][0], b = pts[Math.min(pts.length - 1, i + 1)][0];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [p, [-ty / l, tx / l]];
  });
}

/** Sleeve centre line for a front-cover angle (0 = closed, OPEN_ANGLE = open on the table). */
export function sleevePath(angle: number): PathPoint[] {
  const yIn = BOARD + H, bc: V2 = [W / 2, BOARD / 2], br = BOARD / 2 + H, sc: V2 = [-W / 2, T / 2];
  const back = withNormals([
    ...line([W / 2 - FLAP, yIn], [W / 2, yIn], N_FLAP),
    ...arc(bc, br, br, Math.PI / 2, -Math.PI / 2, N_FOLD).slice(1),
    ...line([W / 2, -H], [-W / 2, -H], N_FLAT).slice(1),
    ...arc(sc, SPINE_RX + H, T / 2 + H, -Math.PI / 2, -1.5 * Math.PI, N_SPINE).slice(1),
  ]);
  // joint: circle around PIVOT, from straight below it, turning with the cover
  const joint: [V2, V2][] = [];
  for (let i = 1; i <= N_JOINT; i++) {
    const a = -Math.PI / 2 + angle * i / N_JOINT, d: V2 = [Math.cos(a), Math.sin(a)];
    joint.push([[PIVOT[0] + RHO * d[0], PIVOT[1] + RHO * d[1]], [-d[0], -d[1]]]);
  }
  const front = frontPath(angle);

  const out: PathPoint[] = [];
  let u = 0;
  back.forEach(([p, n], i) => { if (i) u += Math.hypot(p[0] - back[i - 1][0][0], p[1] - back[i - 1][0][1]); out.push({ p, n, u, front: false }); });
  const u0 = u;
  joint.forEach(([p, n], i) => out.push({ p, n, u: u0 + JOINT_U * (i + 1) / N_JOINT, front: true }));
  let uf = u0 + JOINT_U, prev = joint[joint.length - 1][0];
  front.forEach(([p, n]) => { uf += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p; out.push({ p, n, u: uf, front: true }); });
  // the front's own arc lengths do not depend on the angle, so `u` there is constant per vertex
  return out;
}

export const PATH_LENGTH = sleevePath(0).length;

/** Rigid transform of the front cover (board, flap, panel...) for an angle: rotate about PIVOT around Z. */
export function frontTransform(angle: number) {
  // rotation about the Z axis through PIVOT = translate(P) * rotZ(a) * translate(-P)
  return { pivot: PIVOT, angle };
}

/** Rounded-rectangle loop in a plane (used for the panel join and the running stitch). */
export function roundedRect(w: number, h: number, r: number, perCorner = 8): V2[] {
  const pts: V2[] = [], cs: [number, number, number][] = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, 1.5 * Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= perCorner; i++) { const a = a0 + Math.PI / 2 * i / perCorner; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}

// ---- solids used by the tests (and the page block mesh) ----
export const PAGES = { x0: -W / 2, x1: W / 2 - SQUARE, y0: BOARD + FAB, y1: T - BOARD - FAB - 0.02, z0: -D / 2 + SQUARE, z1: D / 2 - SQUARE };

/** Corners of the front board (closed frame) turned by `angle`. */
export function frontBoardCorners(angle: number): V2[] {
  return ([[-W / 2, T - BOARD], [W / 2, T - BOARD], [W / 2, T], [-W / 2, T]] as V2[]).map(p => rot(p, angle));
}

/** Fully open angle: 180 degrees plus the droop that lets the cover's far edge rest on the table. */
export const OPEN_ANGLE = (() => {
  // lowest point of the front fold (outer fabric surface) must reach the table (y = -FAB)
  const lowest = (a: number) => Math.min(...frontPath(a).map(([p, n]) => p[1] + n[1] * H));
  let lo = Math.PI, hi = Math.PI + 0.6;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (lowest(m) > -FAB + 0.02) lo = m; else hi = m; }
  return lo;
})();
